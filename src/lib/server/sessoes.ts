/**
 * Serviço de sessões: regras de transição de estado, calibração (RF-03),
 * lote de repetições com idempotência (RNF-03) e conclusão com geração de
 * avaliação (RF-04). Usado apenas pelos Route Handlers; erros de regra são
 * lançados como ErroApi e convertidos no envelope do contrato.
 */
import type {
  CalibracaoCreateInput,
  LoteRepeticoesInput,
  ResultadoSessaoDTO,
  SessaoDTO,
  SessaoDetalheDTO,
} from '@/lib/domain/contratos'
import { LIMIAR_CALIBRACAO_UNIDADES, TEMPO_MAX_REPETICAO_MS } from '@/lib/domain/constantes'
import type { Sessao } from '@prisma/client'
import { mapearAvaliacao, mapearExercicio, mapearSessao } from './dto'
import { ErroApi, gerarId } from './http'
import { prisma } from './prisma'

/**
 * RF-03 fixa a janela de repouso em 3 s; o contrato aceita duracaoMs >= 2900
 * (100 ms de tolerância de relógio entre navegador e servidor).
 */
const DURACAO_MINIMA_CALIBRACAO_MS = 2900

/** Exercicio padrão de toda sessão nova (contrato §Sessões; tempoMaxMs = RF-05). */
const EXERCICIO_PADRAO = {
  direcao: 'FRENTE' as const,
  zonaNeutraMin: -30,
  zonaNeutraMax: 30,
  limiar: 120,
  tempoMaxMs: TEMPO_MAX_REPETICAO_MS,
}

/** Busca a sessão dentro do escopo do usuário; fora dele (ou inexistente) → 404. */
async function obterSessaoNoEscopo(usuarioId: string, sessaoId: string): Promise<Sessao> {
  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, paciente: { criadoPorId: usuarioId } },
  })
  if (!sessao) {
    throw new ErroApi(404, { erro: 'Sessão não encontrada.' })
  }
  return sessao
}

/** POST /api/sessoes — cria Sessao PREPARANDO + Exercicio padrão. 409 se já houver ativa. */
export async function criarSessao(usuarioId: string, pacienteId: string): Promise<SessaoDetalheDTO> {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, criadoPorId: usuarioId },
    select: { id: true },
  })
  if (!paciente) {
    throw new ErroApi(404, { erro: 'Paciente não encontrado.' })
  }

  const sessao = await prisma.$transaction(async (tx) => {
    const ativa = await tx.sessao.findFirst({
      where: { pacienteId, status: { in: ['PREPARANDO', 'EM_ANDAMENTO'] } },
      select: { id: true },
    })
    if (ativa) {
      throw new ErroApi(409, { erro: 'Este paciente já possui uma sessão em preparação ou em andamento.' }, { sessaoId: ativa.id })
    }
    return tx.sessao.create({
      data: {
        id: gerarId('ses'),
        pacienteId,
        status: 'PREPARANDO',
        inicio: new Date(),
        exercicio: { create: { id: gerarId('exe'), ...EXERCICIO_PADRAO } },
      },
      include: { exercicio: true },
    })
  })

  // O exercício é criado na mesma chamada; se faltar, é falha interna do servidor.
  if (!sessao.exercicio) {
    throw new ErroApi(500, { erro: 'Erro interno: o exercício padrão não foi criado.' })
  }
  return {
    sessao: mapearSessao(sessao),
    exercicio: mapearExercicio(sessao.exercicio, pacienteId),
    repeticoes: [],
  }
}

/**
 * POST /api/sessoes/:id/calibracao — aceita = variacaoMax <= 50 (inclusive) e
 * duracaoMs >= 2900. Aceita → EM_ANDAMENTO + calibracaoAceita; rejeitada
 * mantém PREPARANDO e responde 200 com aceita:false (nova tentativa).
 */
export async function registrarCalibracao(
  usuarioId: string,
  sessaoId: string,
  entrada: CalibracaoCreateInput,
): Promise<{ aceita: boolean; sessao: SessaoDTO }> {
  const sessao = await obterSessaoNoEscopo(usuarioId, sessaoId)
  if (sessao.status !== 'PREPARANDO') {
    throw new ErroApi(409, { erro: 'A calibração só pode ser registrada enquanto a sessão está em preparação.' })
  }

  const aceita = entrada.variacaoMax <= LIMIAR_CALIBRACAO_UNIDADES && entrada.duracaoMs >= DURACAO_MINIMA_CALIBRACAO_MS
  if (!aceita) {
    return { aceita: false, sessao: mapearSessao(sessao) }
  }

  const atualizada = await prisma.sessao.update({
    where: { id: sessaoId },
    data: { status: 'EM_ANDAMENTO', calibracaoAceita: true },
  })
  return { aceita: true, sessao: mapearSessao(atualizada) }
}

/**
 * POST /api/sessoes/:id/repeticao — grava o lote e recalcula os agregados da
 * sessão NA MESMA transação. Idempotente por `sequencia`: lote com sequência
 * ≤ ultimaSequencia já foi processado e é ignorado (resposta 200, nada gravado).
 */
export async function registrarLoteRepeticoes(
  usuarioId: string,
  sessaoId: string,
  lote: LoteRepeticoesInput,
): Promise<{ aceitas: number; totalRepeticoesValidas: number }> {
  await obterSessaoNoEscopo(usuarioId, sessaoId)

  const resultado = await prisma.$transaction(async (tx) => {
    const sessao = await tx.sessao.findUniqueOrThrow({
      where: { id: sessaoId },
      select: { status: true, ultimaSequencia: true, totalRepeticoesValidas: true },
    })
    if (sessao.status !== 'EM_ANDAMENTO') {
      throw new ErroApi(409, { erro: 'Só é possível registrar repetições com a sessão em andamento.' })
    }
    if (lote.sequencia <= sessao.ultimaSequencia) {
      // Reenvio (rede oscilou): já processado, responde sem duplicar (RNF-03).
      return { duplicado: true, totalRepeticoesValidas: sessao.totalRepeticoesValidas }
    }

    const maiorOrdem = await tx.repeticao.aggregate({
      where: { sessaoId },
      _max: { ordem: true },
    })
    const ordemBase = maiorOrdem._max.ordem ?? 0
    await tx.repeticao.createMany({
      data: lote.repeticoes.map((repeticao, indice) => ({
        id: gerarId('rep'),
        sessaoId,
        ordem: ordemBase + indice + 1,
        tInicioMs: repeticao.tInicioMs,
        duracaoMs: repeticao.duracaoMs,
        amplitude: repeticao.amplitude,
        valida: repeticao.valida,
      })),
    })

    const [validas, extremos] = await Promise.all([
      tx.repeticao.count({ where: { sessaoId, valida: true } }),
      tx.repeticao.aggregate({ where: { sessaoId }, _max: { amplitude: true } }),
    ])
    await tx.sessao.update({
      where: { id: sessaoId },
      data: {
        ultimaSequencia: lote.sequencia,
        totalRepeticoesValidas: validas,
        amplitudeMaxima: extremos._max.amplitude ?? 0,
      },
    })
    return { duplicado: false, totalRepeticoesValidas: validas }
  })

  return {
    // Lote duplicado: nada foi gravado agora, então nada foi "aceito" agora.
    aceitas: resultado.duplicado ? 0 : lote.repeticoes.length,
    totalRepeticoesValidas: resultado.totalRepeticoesValidas,
  }
}

/**
 * PATCH /api/sessoes/:id (concluir) — exige EM_ANDAMENTO, calibração aceita e
 * ≥ 1 repetição válida (409 caso contrário). Encerra a sessão e gera a
 * Avaliacao (INICIAL se o paciente ainda não tiver nenhuma, senão
 * ACOMPANHAMENTO) com os 4 alcances = amplitudeMaxima da sessão.
 */
export async function concluirSessao(usuarioId: string, sessaoId: string): Promise<ResultadoSessaoDTO> {
  const resultado = await prisma.$transaction(async (tx) => {
    const sessao = await tx.sessao.findFirst({
      where: { id: sessaoId, paciente: { criadoPorId: usuarioId } },
    })
    if (!sessao) {
      throw new ErroApi(404, { erro: 'Sessão não encontrada.' })
    }
    if (sessao.status !== 'EM_ANDAMENTO') {
      throw new ErroApi(409, { erro: 'Só é possível concluir uma sessão em andamento.' })
    }
    if (!sessao.calibracaoAceita) {
      throw new ErroApi(409, { erro: 'A sessão precisa da calibração aceita antes de ser concluída.' })
    }
    if (sessao.totalRepeticoesValidas < 1) {
      throw new ErroApi(409, { erro: 'Registre pelo menos uma repetição válida antes de concluir a sessão.' })
    }

    const fim = new Date()
    const atualizada = await tx.sessao.update({
      where: { id: sessaoId },
      data: { status: 'CONCLUIDA', fim },
    })

    const jaTemInicial = await tx.avaliacao.findFirst({
      where: { pacienteId: sessao.pacienteId, tipo: 'INICIAL' },
      select: { id: true },
    })
    const alcances = Math.round(sessao.amplitudeMaxima)
    const avaliacao = await tx.avaliacao.create({
      data: {
        id: gerarId('avl'),
        pacienteId: sessao.pacienteId,
        tipo: jaTemInicial ? 'ACOMPANHAMENTO' : 'INICIAL',
        dataHora: fim,
        alcanceFrente: alcances,
        alcanceTras: alcances,
        alcanceEsquerda: alcances,
        alcanceDireita: alcances,
        sessaoId,
      },
    })

    // Última sessão concluída ANTERIOR a esta: como só existe uma sessão
    // ativa por paciente, toda outra concluída começou antes desta.
    const anterior = await tx.sessao.findFirst({
      where: { pacienteId: sessao.pacienteId, status: 'CONCLUIDA', inicio: { lt: sessao.inicio } },
      orderBy: { inicio: 'desc' },
    })
    const inicial = await tx.avaliacao.findFirst({
      where: { pacienteId: sessao.pacienteId, tipo: 'INICIAL' },
      orderBy: { dataHora: 'asc' },
    })

    return { sessao: atualizada, avaliacao, anterior, inicial }
  })

  return {
    sessao: mapearSessao(resultado.sessao),
    avaliacao: mapearAvaliacao(resultado.avaliacao),
    comparacao: {
      repeticaoAnterior: resultado.anterior ? resultado.anterior.totalRepeticoesValidas : null,
      amplitudeAnterior: resultado.anterior ? resultado.anterior.amplitudeMaxima : null,
      avaliacaoInicial: resultado.inicial ? mapearAvaliacao(resultado.inicial) : null,
    },
  }
}

/** PATCH /api/sessoes/:id (abortar) — encerra como ABORTADA de onde estiver. */
export async function abortarSessao(usuarioId: string, sessaoId: string): Promise<SessaoDTO> {
  const sessao = await obterSessaoNoEscopo(usuarioId, sessaoId)
  if (sessao.status === 'CONCLUIDA' || sessao.status === 'ABORTADA') {
    throw new ErroApi(409, { erro: 'Esta sessão já foi encerrada.' })
  }
  const atualizada = await prisma.sessao.update({
    where: { id: sessaoId },
    data: { status: 'ABORTADA', fim: new Date() },
  })
  return mapearSessao(atualizada)
}

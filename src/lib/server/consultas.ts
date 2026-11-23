/**
 * Consultas para Server Components (contrato docs/CONTRATO-API.md §Consultas).
 * O frontend consome estas funções APENAS no servidor; mutações vão por HTTP.
 *
 * Escopo: todo filtro inclui o usuário logado — paciente de outro fisio é
 * tratado como inexistente (null), nunca como negado.
 */
import type {
  AvaliacaoDTO,
  PacienteDetalheDTO,
  ResumoPacienteDTO,
  SessaoDetalheDTO,
  SessaoDTO,
} from '@/lib/domain/contratos'
import type { Sessao } from '@prisma/client'
import type { PacienteListagemDTO } from '@/types/listagem'
import type {
  ItemFeedDTO,
  PacientePainelDTO,
  PainelDTO,
  SemanaPainelDTO,
} from '@/types/painel'
import { formatarDiaMesCurto } from '@/lib/ui-format'
import { prisma } from './prisma'
import { mapearAvaliacao, mapearExercicio, mapearPaciente, mapearRepeticao, mapearSessao } from './dto'

const DIA_MS = 24 * 60 * 60 * 1000
const SEMANA_MS = 7 * DIA_MS

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10
}

/** Segunda-feira (00:00 UTC) da semana ISO que contém a data. */
export function segundaFeiraUTC(data: Date): Date {
  const dia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
  const diaDaSemana = (dia.getUTCDay() + 6) % 7 // 0 = segunda
  dia.setUTCDate(dia.getUTCDate() - diaDaSemana)
  return dia
}

export type SemanaConstanciaDTO = {
  semanaInicio: string
  rotulo: string
  atual: boolean
  sessoes: number
}

/**
 * Gera a sequência de semanas ISO até a semana atual com contagem de sessões
 * concluídas por semana — mesma regra de `contarSemanasConsecutivas`.
 */
export function gerarSemanasConstancia(
  concluidas: { inicio: string }[],
  totalSemanas = 8,
): SemanaConstanciaDTO[] {
  const contagemPorSemana = new Map<number, number>()
  for (const sessao of concluidas) {
    const chave = segundaFeiraUTC(new Date(sessao.inicio)).getTime()
    contagemPorSemana.set(chave, (contagemPorSemana.get(chave) ?? 0) + 1)
  }

  const atualSegunda = segundaFeiraUTC(new Date())
  const semanas: SemanaConstanciaDTO[] = []
  for (let i = totalSemanas - 1; i >= 0; i -= 1) {
    const inicioSemana = new Date(atualSegunda.getTime() - i * SEMANA_MS)
    const iso = inicioSemana.toISOString()
    const atual = i === 0
    semanas.push({
      semanaInicio: iso,
      rotulo: atual ? 'Atual' : formatarDiaMesCurto(iso),
      atual,
      sessoes: contagemPorSemana.get(inicioSemana.getTime()) ?? 0,
    })
  }
  return semanas
}

/**
 * Semanas ISO consecutivas com ao menos uma sessão concluída, contando a
 * partir da semana atual — ou da anterior, quando a semana corrente ainda
 * não teve sessão (regra do contrato).
 */
function contarSemanasConsecutivas(concluidas: Sessao[]): number {
  const semanas = new Set(concluidas.map((s) => segundaFeiraUTC(s.inicio).getTime()))
  let atual = segundaFeiraUTC(new Date())
  if (!semanas.has(atual.getTime())) {
    atual = new Date(atual.getTime() - SEMANA_MS)
  }
  let contagem = 0
  while (semanas.has(atual.getTime())) {
    contagem += 1
    atual = new Date(atual.getTime() - SEMANA_MS)
  }
  return contagem
}

/**
 * Resumo do PacienteDetalheDTO, exatamente como o contrato define:
 * - totalSessoes / totalRepeticoes / amplitudeMedia sobre as CONCLUIDAS;
 * - repeticoesUltimaSessao e variações da última contra a média das 3
 *   anteriores (null sem base: menos de 3 anteriores + a última);
 * - semanasConsecutivas ISO.
 */
function calcularResumo(concluidas: Sessao[]): ResumoPacienteDTO {
  const totalSessoes = concluidas.length
  const totalRepeticoes = concluidas.reduce((soma, s) => soma + s.totalRepeticoesValidas, 0)
  const amplitudeMedia =
    totalSessoes > 0
      ? arredondar(concluidas.reduce((soma, s) => soma + s.amplitudeMaxima, 0) / totalSessoes)
      : 0

  const ultima = concluidas.at(-1)
  const anteriores = ultima !== undefined && concluidas.length >= 4 ? concluidas.slice(-4, -1) : []
  const mediaAnteriorReps = anteriores.reduce((soma, s) => soma + s.totalRepeticoesValidas, 0) / anteriores.length
  const mediaAnteriorAmplitude = anteriores.reduce((soma, s) => soma + s.amplitudeMaxima, 0) / anteriores.length
  const temBase = ultima !== undefined && anteriores.length > 0

  return {
    totalSessoes,
    totalRepeticoes,
    amplitudeMedia,
    repeticoesUltimaSessao: ultima ? ultima.totalRepeticoesValidas : null,
    variacaoRepeticoes: temBase ? arredondar(ultima.totalRepeticoesValidas - mediaAnteriorReps) : null,
    variacaoAmplitude: temBase ? arredondar(ultima.amplitudeMaxima - mediaAnteriorAmplitude) : null,
    semanasConsecutivas: contarSemanasConsecutivas(concluidas),
  }
}

function diasDesde(data: Date | undefined, agoraMs: number): number | null {
  if (!data) return null
  return Math.max(0, Math.floor((agoraMs - data.getTime()) / DIA_MS))
}

/**
 * Lista de pacientes do fisioterapeuta (tipo estendido PacienteListagemDTO —
 * superconjunto de PacienteDTO com a última sessão concluída, tendência e
 * série resumida). Busca por nome (`contains`, insensitive); ordem: nome asc.
 */
export async function listarPacientes(usuarioId: string, q?: string): Promise<PacienteListagemDTO[]> {
  const termo = q?.trim()
  const pacientes = await prisma.paciente.findMany({
    where: {
      criadoPorId: usuarioId,
      ...(termo ? { nome: { contains: termo, mode: 'insensitive' } } : {}),
    },
    include: {
      sessoes: { where: { status: 'CONCLUIDA' }, orderBy: { inicio: 'asc' } },
      avaliacoes: { where: { tipo: 'INICIAL' }, select: { id: true }, take: 1 },
    },
    orderBy: { nome: 'asc' },
  })

  const agoraMs = Date.now()

  return pacientes.map((paciente) => {
    const concluidas = paciente.sessoes
    const ultima = concluidas.at(-1)
    const anteriores = ultima !== undefined && concluidas.length >= 4 ? concluidas.slice(-4, -1) : []
    const mediaAnterior = anteriores.reduce((soma, s) => soma + s.totalRepeticoesValidas, 0) / anteriores.length
    const temBase = ultima !== undefined && anteriores.length > 0

    return {
      ...mapearPaciente(paciente),
      ultimaSessao:
        ultima === undefined
          ? null
          : {
              id: ultima.id,
              status: ultima.status,
              inicio: ultima.inicio.toISOString(),
              totalRepeticoesValidas: ultima.totalRepeticoesValidas,
              amplitudeMaxima: ultima.amplitudeMaxima,
            },
      variacaoRepeticoes: temBase ? arredondar(ultima.totalRepeticoesValidas - mediaAnterior) : null,
      totalSessoesConcluidas: concluidas.length,
      semanasConsecutivas: contarSemanasConsecutivas(concluidas),
      diasSemSessao: diasDesde(ultima?.inicio, agoraMs),
      serieRepeticoes: concluidas.slice(-8).map((s) => s.totalRepeticoesValidas),
      temAvaliacaoInicial: paciente.avaliacoes.length > 0,
    }
  })
}

/**
 * Ficha completa do paciente: dados, avaliações (dataHora asc), sessões
 * (inicio asc) e resumo calculado no servidor. null quando o paciente não
 * existe ou pertence a outro usuário.
 */
export async function obterPacienteDetalhe(usuarioId: string, pacienteId: string): Promise<PacienteDetalheDTO | null> {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, criadoPorId: usuarioId },
    include: {
      avaliacoes: { orderBy: { dataHora: 'asc' } },
      sessoes: { orderBy: { inicio: 'asc' } },
    },
  })
  if (!paciente) return null

  const concluidas = paciente.sessoes.filter((s) => s.status === 'CONCLUIDA')
  const sessoes: SessaoDTO[] = paciente.sessoes.map(mapearSessao)
  const avaliacoes: AvaliacaoDTO[] = paciente.avaliacoes.map(mapearAvaliacao)

  return {
    paciente: mapearPaciente(paciente),
    avaliacoes,
    sessoes,
    resumo: calcularResumo(concluidas),
  }
}

/** Nome curto do paciente no escopo do usuário (para telas de preparação/kiosk). */
export async function obterNomePaciente(usuarioId: string, pacienteId: string): Promise<string | null> {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, criadoPorId: usuarioId },
    select: { nome: true },
  })
  return paciente?.nome ?? null
}

/** Sessão com exercício e repetições (ordem asc); null fora do escopo. */
export async function obterSessaoDetalhe(usuarioId: string, sessaoId: string): Promise<SessaoDetalheDTO | null> {
  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, paciente: { criadoPorId: usuarioId } },
    include: {
      exercicio: true,
      repeticoes: { orderBy: { ordem: 'asc' } },
    },
  })
  if (!sessao || !sessao.exercicio) return null

  return {
    sessao: mapearSessao(sessao),
    exercicio: mapearExercicio(sessao.exercicio, sessao.pacienteId),
    repeticoes: sessao.repeticoes.map(mapearRepeticao),
  }
}

const LIMITE_ITENS_FEED = 20
const SEMANAS_PAINEL = 6

/**
 * Painel inicial: resumo da semana com comparação, série semanal de 6 semanas,
 * panorama dos pacientes, sessões retomáveis, feed de atividades e constância.
 * Tudo derivado de sessões, avaliações e cadastros existentes.
 */
export async function obterPainel(usuarioId: string): Promise<PainelDTO> {
  const pacientes = await prisma.paciente.findMany({
    where: { criadoPorId: usuarioId },
    include: {
      sessoes: { orderBy: { inicio: 'asc' } },
      avaliacoes: { where: { tipo: 'INICIAL' }, orderBy: { dataHora: 'asc' } },
    },
    orderBy: { nome: 'asc' },
  })

  const agora = Date.now()
  const limiteSemana = new Date(agora - SEMANA_MS)
  const limiteSemanaAnterior = new Date(agora - 2 * SEMANA_MS)

  let sessoesSemana = 0
  let repeticoesSemana = 0
  let somaAmplitudeSemana = 0
  let pacientesAtivosSemana = 0

  let sessoesSemanaAnterior = 0
  let repeticoesSemanaAnterior = 0
  let somaAmplitudeSemanaAnterior = 0
  let houveSessaoAntesDe7Dias = false

  const distribuicaoStatus = {
    concluidas: 0,
    abortadas: 0,
    abertas: 0,
  }

  const itens: ItemFeedDTO[] = []
  const sessoesAbertas: PainelDTO['sessoesAbertas'] = []
  const pacientesSemSessaoRecente: PainelDTO['pacientesSemSessaoRecente'] = []
  const panoramaPacientes: PacientePainelDTO[] = []

  // Acumuladores por semana ISO (últimas 6 semanas até a atual).
  const atualSegunda = segundaFeiraUTC(new Date())
  const semanasMapa = new Map<
    number,
    {
      semanaInicio: string
      rotulo: string
      atual: boolean
      sessoesConcluidas: number
      pacientesIds: Set<string>
      repeticoesValidas: number
      somaAmplitudes: number
    }
  >()
  const chavesSemana: number[] = []
  for (let i = SEMANAS_PAINEL - 1; i >= 0; i -= 1) {
    const inicioSemana = new Date(atualSegunda.getTime() - i * SEMANA_MS)
    const chave = inicioSemana.getTime()
    const iso = inicioSemana.toISOString()
    const atual = i === 0
    chavesSemana.push(chave)
    semanasMapa.set(chave, {
      semanaInicio: iso,
      rotulo: atual ? 'Atual' : formatarDiaMesCurto(iso),
      atual,
      sessoesConcluidas: 0,
      pacientesIds: new Set<string>(),
      repeticoesValidas: 0,
      somaAmplitudes: 0,
    })
  }

  for (const paciente of pacientes) {
    const concluidas = paciente.sessoes.filter((s) => s.status === 'CONCLUIDA')
    const concluidasRecentes = concluidas.filter((s) => s.inicio >= limiteSemana)
    const concluidasSemanaAnterior = concluidas.filter(
      (s) => s.inicio >= limiteSemanaAnterior && s.inicio < limiteSemana,
    )

    if (concluidas.some((s) => s.inicio < limiteSemana)) {
      houveSessaoAntesDe7Dias = true
    }

    if (concluidasRecentes.length > 0) pacientesAtivosSemana += 1
    sessoesSemana += concluidasRecentes.length
    repeticoesSemana += concluidasRecentes.reduce((soma, s) => soma + s.totalRepeticoesValidas, 0)
    somaAmplitudeSemana += concluidasRecentes.reduce((soma, s) => soma + s.amplitudeMaxima, 0)

    sessoesSemanaAnterior += concluidasSemanaAnterior.length
    repeticoesSemanaAnterior += concluidasSemanaAnterior.reduce(
      (soma, s) => soma + s.totalRepeticoesValidas,
      0,
    )
    somaAmplitudeSemanaAnterior += concluidasSemanaAnterior.reduce(
      (soma, s) => soma + s.amplitudeMaxima,
      0,
    )

    let sessaoAbertaPacienteId: string | null = null

    for (const sessao of paciente.sessoes) {
      if (sessao.status === 'PREPARANDO' || sessao.status === 'EM_ANDAMENTO') {
        distribuicaoStatus.abertas += 1
        sessaoAbertaPacienteId = sessao.id
        sessoesAbertas.push({
          sessaoId: sessao.id,
          status: sessao.status,
          inicio: sessao.inicio.toISOString(),
          pacienteNome: paciente.nome,
        })
        continue
      }

      if (sessao.status === 'CONCLUIDA') {
        distribuicaoStatus.concluidas += 1
        const chaveSemana = segundaFeiraUTC(sessao.inicio).getTime()
        const blocoSemana = semanasMapa.get(chaveSemana)
        if (blocoSemana) {
          blocoSemana.sessoesConcluidas += 1
          blocoSemana.pacientesIds.add(paciente.id)
          blocoSemana.repeticoesValidas += sessao.totalRepeticoesValidas
          blocoSemana.somaAmplitudes += sessao.amplitudeMaxima
        }

        const indice = concluidas.findIndex((s) => s.id === sessao.id)
        const anterior = indice > 0 ? concluidas[indice - 1] : undefined
        itens.push({
          id: `feed-sessao-${sessao.id}`,
          tipo: 'SESSAO_CONCLUIDA',
          dataHora: (sessao.fim ?? sessao.inicio).toISOString(),
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          alvoHref: `/sessao/${sessao.id}/resultado`,
          repeticoes: sessao.totalRepeticoesValidas,
          variacaoRepeticoes: anterior
            ? arredondar(sessao.totalRepeticoesValidas - anterior.totalRepeticoesValidas)
            : null,
          amplitudeMaxima: sessao.amplitudeMaxima,
        })
      } else {
        distribuicaoStatus.abortadas += 1
        itens.push({
          id: `feed-sessao-${sessao.id}`,
          tipo: 'SESSAO_ABORTADA',
          dataHora: (sessao.fim ?? sessao.inicio).toISOString(),
          pacienteId: paciente.id,
          pacienteNome: paciente.nome,
          alvoHref: `/fisio/pacientes/${paciente.id}`,
          repeticoes: null,
          variacaoRepeticoes: null,
          amplitudeMaxima: null,
        })
      }
    }

    // A linha de base gerada pela primeira sessão coincide com o evento de
    // conclusão; o feed só destaca a avaliação registrada manualmente.
    for (const avaliacao of paciente.avaliacoes) {
      if (avaliacao.sessaoId !== null) continue
      itens.push({
        id: `feed-avaliacao-${avaliacao.id}`,
        tipo: 'AVALIACAO_INICIAL',
        dataHora: avaliacao.dataHora.toISOString(),
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        alvoHref: `/fisio/pacientes/${paciente.id}`,
        repeticoes: null,
        variacaoRepeticoes: null,
        amplitudeMaxima: null,
      })
    }

    itens.push({
      id: `feed-paciente-${paciente.id}`,
      tipo: 'PACIENTE_CADASTRADO',
      dataHora: paciente.criadoEm.toISOString(),
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      alvoHref: `/fisio/pacientes/${paciente.id}`,
      repeticoes: null,
      variacaoRepeticoes: null,
      amplitudeMaxima: null,
    })

    const primeiraConcluida = concluidas[0]
    const ultimaConcluida = concluidas.at(-1)
    const diasSem = diasDesde(ultimaConcluida?.inicio, agora)

    if (!ultimaConcluida || ultimaConcluida.inicio < limiteSemana) {
      pacientesSemSessaoRecente.push({
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        ultimaSessao: ultimaConcluida ? ultimaConcluida.inicio.toISOString() : null,
        diasSemSessao: diasSem,
      })
    }

    const resumoPaciente = calcularResumo(concluidas)
    panoramaPacientes.push({
      id: paciente.id,
      nome: paciente.nome,
      lesaoDiagnostico: paciente.lesaoDiagnostico,
      totalSessoesConcluidas: concluidas.length,
      semanasConsecutivas: resumoPaciente.semanasConsecutivas,
      ultimaSessaoEm: ultimaConcluida ? ultimaConcluida.inicio.toISOString() : null,
      diasSemSessao: diasSem,
      repeticoesIniciais: primeiraConcluida ? primeiraConcluida.totalRepeticoesValidas : null,
      repeticoesUltima: ultimaConcluida ? ultimaConcluida.totalRepeticoesValidas : null,
      amplitudeInicial: primeiraConcluida ? arredondar(primeiraConcluida.amplitudeMaxima) : null,
      amplitudeUltima: ultimaConcluida ? arredondar(ultimaConcluida.amplitudeMaxima) : null,
      variacaoRepeticoes: resumoPaciente.variacaoRepeticoes,
      ganhoRepeticoesDesdeInicio:
        concluidas.length >= 2 && primeiraConcluida && ultimaConcluida
          ? ultimaConcluida.totalRepeticoesValidas - primeiraConcluida.totalRepeticoesValidas
          : null,
      ganhoAmplitudeDesdeInicio:
        concluidas.length >= 2 && primeiraConcluida && ultimaConcluida
          ? arredondar(ultimaConcluida.amplitudeMaxima - primeiraConcluida.amplitudeMaxima)
          : null,
      serieRepeticoes: concluidas.slice(-8).map((s) => s.totalRepeticoesValidas),
      serieAmplitudes: concluidas.slice(-8).map((s) => arredondar(s.amplitudeMaxima)),
      temSessaoAberta: sessaoAbertaPacienteId !== null,
      sessaoAbertaId: sessaoAbertaPacienteId,
    })
  }

  const amplitudeMediaSemana =
    sessoesSemana > 0 ? arredondar(somaAmplitudeSemana / sessoesSemana) : null
  const amplitudeMediaSemanaAnterior =
    sessoesSemanaAnterior > 0 ? somaAmplitudeSemanaAnterior / sessoesSemanaAnterior : null

  const semanas: SemanaPainelDTO[] = chavesSemana.map((chave) => {
    const b = semanasMapa.get(chave)
    if (!b) {
      return {
        semanaInicio: new Date(chave).toISOString(),
        rotulo: formatarDiaMesCurto(new Date(chave).toISOString()),
        atual: false,
        sessoesConcluidas: 0,
        pacientesAtivos: 0,
        repeticoesValidas: 0,
        amplitudeMedia: null,
      }
    }
    return {
      semanaInicio: b.semanaInicio,
      rotulo: b.rotulo,
      atual: b.atual,
      sessoesConcluidas: b.sessoesConcluidas,
      pacientesAtivos: b.pacientesIds.size,
      repeticoesValidas: b.repeticoesValidas,
      amplitudeMedia:
        b.sessoesConcluidas > 0 ? arredondar(b.somaAmplitudes / b.sessoesConcluidas) : null,
    }
  })

  itens.sort((a, b) => (a.dataHora < b.dataHora ? 1 : -1))
  sessoesAbertas.sort((a, b) => (a.inicio < b.inicio ? 1 : -1))
  pacientesSemSessaoRecente.sort((a, b) => ((a.ultimaSessao ?? '') < (b.ultimaSessao ?? '') ? -1 : 1))

  return {
    resumo: {
      pacientes: pacientes.length,
      pacientesAtivosSemana,
      sessoesSemana,
      variacaoSessoesSemana: houveSessaoAntesDe7Dias
        ? sessoesSemana - sessoesSemanaAnterior
        : null,
      repeticoesSemana,
      variacaoRepeticoesSemana: houveSessaoAntesDe7Dias
        ? repeticoesSemana - repeticoesSemanaAnterior
        : null,
      amplitudeMediaSemana,
      variacaoAmplitudeSemana:
        amplitudeMediaSemana !== null && amplitudeMediaSemanaAnterior !== null
          ? arredondar(amplitudeMediaSemana - amplitudeMediaSemanaAnterior)
          : null,
      distribuicaoStatus,
    },
    semanas,
    panoramaPacientes,
    sessoesAbertas,
    itens: itens.slice(0, LIMITE_ITENS_FEED),
    pacientesSemSessaoRecente,
  }
}

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
import { prisma } from './prisma'
import { mapearAvaliacao, mapearExercicio, mapearPaciente, mapearRepeticao, mapearSessao } from './dto'

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10
}

/** Segunda-feira (00:00 UTC) da semana ISO que contém a data. */
function segundaFeiraUTC(data: Date): Date {
  const dia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
  const diaDaSemana = (dia.getUTCDay() + 6) % 7 // 0 = segunda
  dia.setUTCDate(dia.getUTCDate() - diaDaSemana)
  return dia
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
    atual = new Date(atual.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
  let contagem = 0
  while (semanas.has(atual.getTime())) {
    contagem += 1
    atual = new Date(atual.getTime() - 7 * 24 * 60 * 60 * 1000)
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

/**
 * Lista de pacientes do fisioterapeuta (tipo estendido PacienteListagemDTO —
 * superconjunto de PacienteDTO com a última sessão concluída e a tendência).
 * Busca por nome (`contains`, insensitive); ordem: nome ascendente.
 */
export async function listarPacientes(usuarioId: string, q?: string): Promise<PacienteListagemDTO[]> {
  const termo = q?.trim()
  const pacientes = await prisma.paciente.findMany({
    where: {
      criadoPorId: usuarioId,
      ...(termo ? { nome: { contains: termo, mode: 'insensitive' } } : {}),
    },
    include: { sessoes: { where: { status: 'CONCLUIDA' }, orderBy: { inicio: 'asc' } } },
    orderBy: { nome: 'asc' },
  })

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

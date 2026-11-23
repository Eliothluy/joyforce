/**
 * Tipos do painel inicial (feed de atividades e dashboard clínico). Calculados no
 * servidor em `src/lib/server/consultas.ts`; derivam exclusivamente de dados
 * que já existem (sessões, avaliações e cadastros) — nenhuma métrica nova.
 */
import type { StatusSessao } from '@/lib/domain/contratos'

export type TipoItemFeed =
  | 'SESSAO_CONCLUIDA'
  | 'SESSAO_ABORTADA'
  | 'AVALIACAO_INICIAL'
  | 'PACIENTE_CADASTRADO'

export type ItemFeedDTO = {
  id: string
  tipo: TipoItemFeed
  /** ISO 8601 */
  dataHora: string
  pacienteId: string
  pacienteNome: string
  /** Para onde o item leva: resultado da sessão ou ficha do paciente. */
  alvoHref: string
  /** Somente SESSAO_CONCLUIDA. */
  repeticoes: number | null
  /** Última sessão concluída do paciente contra a anterior; null sem base. */
  variacaoRepeticoes: number | null
  /** Somente SESSAO_CONCLUIDA. */
  amplitudeMaxima: number | null
}

export type SessaoAbertaDTO = {
  sessaoId: string
  status: StatusSessao
  inicio: string
  pacienteNome: string
}

export type DistribuicaoStatusDTO = {
  concluidas: number
  abortadas: number
  abertas: number
}

export type ResumoPainelDTO = {
  pacientes: number
  /** Pacientes com pelo menos 1 sessão concluída nos últimos 7 dias. */
  pacientesAtivosSemana: number
  /** Sessões concluídas nos últimos 7 dias. */
  sessoesSemana: number
  /** Diferença vs. janela anterior de 7 dias; null sem histórico antes de 7 dias. */
  variacaoSessoesSemana: number | null
  /** Repetições válidas somadas nas sessões concluídas dos últimos 7 dias. */
  repeticoesSemana: number
  /** Diferença vs. janela anterior de 7 dias; null sem histórico antes de 7 dias. */
  variacaoRepeticoesSemana: number | null
  /** Amplitude média das sessões concluídas nos últimos 7 dias; null se nenhuma. */
  amplitudeMediaSemana: number | null
  /** Diferença da amplitude média vs. janela anterior de 7 dias; null sem base. */
  variacaoAmplitudeSemana: number | null
  distribuicaoStatus: DistribuicaoStatusDTO
}

export type SemanaPainelDTO = {
  /** ISO 8601 da segunda-feira UTC (00:00). */
  semanaInicio: string
  /** Rótulo curto da semana (ex.: "12 out" ou "Atual"). */
  rotulo: string
  atual: boolean
  sessoesConcluidas: number
  pacientesAtivos: number
  repeticoesValidas: number
  amplitudeMedia: number | null
}

export type PacientePainelDTO = {
  id: string
  nome: string
  lesaoDiagnostico: string
  totalSessoesConcluidas: number
  semanasConsecutivas: number
  ultimaSessaoEm: string | null
  diasSemSessao: number | null
  repeticoesIniciais: number | null
  repeticoesUltima: number | null
  amplitudeInicial: number | null
  amplitudeUltima: number | null
  variacaoRepeticoes: number | null
  ganhoRepeticoesDesdeInicio: number | null
  ganhoAmplitudeDesdeInicio: number | null
  serieRepeticoes: number[]
  serieAmplitudes: number[]
  temSessaoAberta: boolean
  sessaoAbertaId: string | null
}

export type PainelDTO = {
  resumo: ResumoPainelDTO
  /** Últimas 6 semanas ISO, da mais antiga à atual. */
  semanas: SemanaPainelDTO[]
  /** Quadro resumido de evolução por paciente. */
  panoramaPacientes: PacientePainelDTO[]
  /** Sessões PREPARANDO ou EM_ANDAMENTO (retomáveis), mais recentes primeiro. */
  sessoesAbertas: SessaoAbertaDTO[]
  /**
   * Atividade recente, mais nova primeiro. AVALIACAO_INICIAL entra apenas
   * quando registrada manualmente (sessaoId nula); a gerada pela primeira
   * sessão coincide com o evento de conclusão e não se repete.
   */
  itens: ItemFeedDTO[]
  /**
   * Pacientes sem sessão concluída há mais de 7 dias (ou sem nenhuma),
   * ordenados pelo mais tempo parado — leitura de constância do canvas.
   */
  pacientesSemSessaoRecente: {
    pacienteId: string
    pacienteNome: string
    ultimaSessao: string | null
    diasSemSessao: number | null
  }[]
}

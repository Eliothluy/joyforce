/**
 * Contrato compartilhado entre front-end e API.
 *
 * Fonte única de verdade para formatos de entrada/saída. Nada aqui importa
 * código de servidor ou de navegador: é seguro usar dos dois lados.
 */
import { z } from 'zod'

/* ------------------------------------------------------------------ enums */

export const direcoes = ['FRENTE', 'TRAS', 'ESQUERDA', 'DIREITA'] as const
export const direcaoSchema = z.enum(direcoes)
export type Direcao = (typeof direcoes)[number]

export const tiposAvaliacao = ['INICIAL', 'ACOMPANHAMENTO'] as const
export const tipoAvaliacaoSchema = z.enum(tiposAvaliacao)
export type TipoAvaliacao = (typeof tiposAvaliacao)[number]

export const statusSessao = ['PREPARANDO', 'EM_ANDAMENTO', 'CONCLUIDA', 'ABORTADA'] as const
export const statusSessaoSchema = z.enum(statusSessao)
export type StatusSessao = (typeof statusSessao)[number]

/* --------------------------------------------------------------- entradas */

const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((valor) => !Number.isNaN(new Date(`${valor}T00:00:00Z`).getTime()), 'Data inválida.')
  .refine((valor) => new Date(`${valor}T00:00:00Z`) <= new Date(), 'A data não pode estar no futuro.')

/** HU-01 CA3: exatamente 10 dígitos é aceito; abaixo disso, recusado. */
const telefone = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'O telefone deve ter exatamente 10 dígitos (DDD + número).')

export const pacienteCreateSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  dataNascimento: dataISO,
  lesaoDiagnostico: z.string().trim().min(3, 'Descreva a lesão ou o diagnóstico.').max(240),
  telefone,
})
export type PacienteCreateInput = z.infer<typeof pacienteCreateSchema>

/** Medida em unidades do dispositivo; limite alto só para barrar lixo. */
const alcance = z.coerce.number().int('A medida deve ser um número inteiro.').min(0).max(5000)

export const avaliacaoCreateSchema = z.object({
  dataHora: z.string().datetime({ offset: true }).optional(),
  alcanceFrente: alcance,
  alcanceTras: alcance,
  alcanceEsquerda: alcance,
  alcanceDireita: alcance,
  sessaoId: z.string().min(1).optional(),
})
export type AvaliacaoCreateInput = z.infer<typeof avaliacaoCreateSchema>

export const calibracaoCreateSchema = z.object({
  // Referência = média do sinal em repouso: medida do dispositivo, portanto
  // decimal (o .int() antigo rejeitava calibrações válidas com "Dados inválidos").
  referencia: z.coerce.number().min(-5000).max(5000),
  variacaoMax: z.coerce.number().min(0).max(5000),
  duracaoMs: z.coerce.number().int().min(0).max(60_000),
})
export type CalibracaoCreateInput = z.infer<typeof calibracaoCreateSchema>

export const repeticaoCreateSchema = z.object({
  tInicioMs: z.coerce.number().int().min(0),
  duracaoMs: z.coerce.number().int().min(0).max(60_000),
  amplitude: z.coerce.number().min(0).max(5000),
  valida: z.boolean(),
})
export type RepeticaoCreateInput = z.infer<typeof repeticaoCreateSchema>

/**
 * Envio em lote: a fila do navegador manda de 1 a 500 repetições por vez.
 *
 * `sequencia` é monotônica por sessão e torna o reenvio idempotente: se o
 * servidor já recebeu um lote com sequência maior ou igual, responde 200 sem
 * gravar nada. É o que protege o RNF-03 quando a rede oscila.
 */
export const loteRepeticoesSchema = z.object({
  sequencia: z.coerce.number().int().min(1),
  repeticoes: z.array(repeticaoCreateSchema).min(1).max(500),
})
export type LoteRepeticoesInput = z.infer<typeof loteRepeticoesSchema>

export const sessaoAcaoSchema = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('concluir') }),
  z.object({ acao: z.literal('abortar') }),
])
export type SessaoAcaoInput = z.infer<typeof sessaoAcaoSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})
export type LoginInput = z.infer<typeof loginSchema>

/* ---------------------------------------------------------------- saídas */

export type UsuarioDTO = {
  id: string
  nome: string
  email: string
}

export type PacienteDTO = {
  id: string
  nome: string
  /** AAAA-MM-DD */
  dataNascimento: string
  lesaoDiagnostico: string
  telefone: string
  /** ISO 8601 */
  criadoEm: string
}

export type AvaliacaoDTO = {
  id: string
  pacienteId: string
  tipo: TipoAvaliacao
  dataHora: string
  alcanceFrente: number
  alcanceTras: number
  alcanceEsquerda: number
  alcanceDireita: number
  sessaoId: string | null
}

export type SessaoDTO = {
  id: string
  pacienteId: string
  status: StatusSessao
  inicio: string
  fim: string | null
  totalRepeticoesValidas: number
  amplitudeMaxima: number
  calibracaoAceita: boolean
  /** Maior `sequencia` de lote já gravada; o cliente recomeça daqui após recarregar. */
  ultimaSequencia: number
}

export type ExercicioDTO = {
  id: string
  pacienteId: string
  direcao: Direcao
  zonaNeutraMin: number
  zonaNeutraMax: number
  limiar: number
  tempoMaxMs: number
}

export type RepeticaoDTO = {
  id: string
  sessaoId: string
  ordem: number
  tInicioMs: number
  duracaoMs: number
  amplitude: number
  valida: boolean
}

export type ResumoPacienteDTO = {
  totalSessoes: number
  totalRepeticoes: number
  amplitudeMedia: number
  repeticoesUltimaSessao: number | null
  /** Última sessão comparada à média das 3 anteriores; null quando não há base. */
  variacaoRepeticoes: number | null
  variacaoAmplitude: number | null
  /** Semanas consecutivas com pelo menos uma sessão concluída. */
  semanasConsecutivas: number
}

export type PacienteDetalheDTO = {
  paciente: PacienteDTO
  avaliacoes: AvaliacaoDTO[]
  sessoes: SessaoDTO[]
  resumo: ResumoPacienteDTO
}

export type SessaoDetalheDTO = {
  sessao: SessaoDTO
  exercicio: ExercicioDTO
  repeticoes: RepeticaoDTO[]
}

export type ResultadoSessaoDTO = {
  sessao: SessaoDTO
  avaliacao: AvaliacaoDTO
  comparacao: {
    repeticaoAnterior: number | null
    amplitudeAnterior: number | null
    avaliacaoInicial: AvaliacaoDTO | null
  }
}

export type ErroDTO = {
  erro: string
  campos?: Record<string, string>
}

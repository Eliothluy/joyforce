/**
 * Cliente HTTP tipado para os endpoints do CONTRATO-API.md.
 *
 * Regras:
 * - o envelope de erro `{ erro, campos? }` vira `ErroApi` estruturado
 *   (mensagem pt-BR, status e campos por campo) — nunca `throw` silencioso;
 * - falha de rede vira mensagem de ação, não exceção crua;
 * - tipos vêm de `@/lib/domain/contratos` (fonte única de verdade).
 *
 * Único ponto de conversão `unknown → T` é o parse da resposta OK (fronteira
 * de confiança da rede); tudo o mais é verificado.
 */
import type {
  AvaliacaoDTO,
  CalibracaoCreateInput,
  LoteRepeticoesInput,
  LoginInput,
  PacienteCreateInput,
  PacienteDTO,
  ResultadoSessaoDTO,
  SessaoDetalheDTO,
  SessaoDTO,
  UsuarioDTO,
  AvaliacaoCreateInput,
} from '@/lib/domain/contratos'

/* ------------------------------------------------------------------ erros */

export class ErroApi extends Error {
  readonly status: number
  /** Erros por campo vindos do 400 (ex.: `{ telefone: '…' }`). */
  readonly campos: Record<string, string> | null
  /** Corpo bruto da resposta, para casos especiais (ex.: 409 com sessaoId). */
  readonly dados: unknown

  constructor(mensagem: string, status: number, dados: unknown = null, campos: Record<string, string> | null = null) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.dados = dados
    this.campos = campos
  }
}

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null
}

function mensagemPadrao(status: number): string {
  if (status === 400) return 'Não foi possível validar os dados informados.'
  if (status === 401) return 'Sessão expirada. Entre novamente para continuar.'
  if (status === 404) return 'Registro não encontrado.'
  if (status === 409) return 'Esta ação conflita com o estado atual.'
  if (status >= 500) return 'O servidor teve um problema. Tente de novo em instantes.'
  return 'Não foi possível concluir a operação.'
}

function interpretarErro(corpo: unknown, status: number): ErroApi {
  if (ehRegistro(corpo)) {
    const mensagem = texto(corpo['erro']) ?? mensagemPadrao(status)
    let campos: Record<string, string> | null = null
    const brutos = corpo['campos']
    if (ehRegistro(brutos)) {
      const coletados: Record<string, string> = {}
      for (const [chave, valor] of Object.entries(brutos)) {
        const rotulo = texto(valor)
        if (rotulo !== null) coletados[chave] = rotulo
      }
      if (Object.keys(coletados).length > 0) campos = coletados
    }
    return new ErroApi(mensagem, status, corpo, campos)
  }
  return new ErroApi(mensagemPadrao(status), status, corpo, null)
}

/** Mensagem pronta para exibir, qualquer que seja a falha. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message
  if (erro instanceof Error && erro.message.length > 0) return erro.message
  return 'Algo inesperado aconteceu. Tente de novo.'
}

/** Campos por campo quando o erro veio de validação (400), ou null. */
export function camposDeErro(erro: unknown): Record<string, string> | null {
  return erro instanceof ErroApi ? erro.campos : null
}

/* ------------------------------------------------------------------ núcleo */

async function pedirJson<T>(caminho: string, metodo: 'POST' | 'PATCH' | 'GET', corpo?: unknown): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi(
      'Não foi possível falar com o servidor. Confira a conexão e tente de novo.',
      0,
    )
  }

  const bruto: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) throw interpretarErro(bruto, resposta.status)
  // Fronteira de confiança: o contrato garante o formato de `T`.
  return bruto as T
}

async function pedirSemConteudo(caminho: string, metodo: 'POST' | 'PATCH'): Promise<void> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, { method: metodo })
  } catch {
    throw new ErroApi(
      'Não foi possível falar com o servidor. Confira a conexão e tente de novo.',
      0,
    )
  }
  if (resposta.status === 204) return
  const bruto: unknown = await resposta.json().catch(() => null)
  if (!resposta.ok) throw interpretarErro(bruto, resposta.status)
}

/* -------------------------------------------------------------------- auth */

/** POST /api/auth/login — 401 vira `ErroApi` com a mensagem do servidor. */
export async function entrar(entrada: LoginInput): Promise<UsuarioDTO> {
  const corpo = await pedirJson<{ usuario: UsuarioDTO }>('/api/auth/login', 'POST', entrada)
  return corpo.usuario
}

/** POST /api/auth/logout — encerra a sessão no servidor (204). */
export function sair(): Promise<void> {
  return pedirSemConteudo('/api/auth/logout', 'POST')
}

/* --------------------------------------------------------------- pacientes */

/** POST /api/pacientes — 400 devolve `campos` por campo. */
export function criarPaciente(entrada: PacienteCreateInput): Promise<PacienteDTO> {
  return pedirJson<PacienteDTO>('/api/pacientes', 'POST', entrada)
}

/**
 * POST /api/pacientes/:id/avaliacoes — registra uma avaliação manual
 * (409 se já existir INICIAL). O fluxo normal gera avaliação ao concluir
 * a sessão; este caminho existe para usos administrativos.
 */
export function criarAvaliacao(pacienteId: string, entrada: AvaliacaoCreateInput): Promise<AvaliacaoDTO> {
  return pedirJson<AvaliacaoDTO>(`/api/pacientes/${encodeURIComponent(pacienteId)}/avaliacoes`, 'POST', entrada)
}

/* ---------------------------------------------------------------- sessões */

export type ResultadoCriarSessao =
  | { tipo: 'criada'; sessao: SessaoDetalheDTO }
  | { tipo: 'sessaoEmAndamento'; sessaoId: string; mensagem: string }

/** POST /api/sessoes — 409 (já existe sessão aberta) vira resultado tipado. */
export async function criarSessao(pacienteId: string): Promise<ResultadoCriarSessao> {
  try {
    const sessao = await pedirJson<SessaoDetalheDTO>('/api/sessoes', 'POST', { pacienteId })
    return { tipo: 'criada', sessao }
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 409 && ehRegistro(erro.dados)) {
      const sessaoId = texto(erro.dados['sessaoId'])
      if (sessaoId !== null) {
        return { tipo: 'sessaoEmAndamento', sessaoId, mensagem: erro.message }
      }
    }
    throw erro
  }
}

/** GET /api/sessoes/:id — retomada de sessão após recarregar a página. */
export function obterSessao(sessaoId: string): Promise<SessaoDetalheDTO> {
  return pedirJson<SessaoDetalheDTO>(`/api/sessoes/${encodeURIComponent(sessaoId)}`, 'GET')
}

/** POST /api/sessoes/:id/calibracao — resultado do RF-03 decidido no servidor. */
export function calibrar(
  sessaoId: string,
  entrada: CalibracaoCreateInput,
): Promise<{ aceita: boolean; sessao: SessaoDTO }> {
  return pedirJson<{ aceita: boolean; sessao: SessaoDTO }>(
    `/api/sessoes/${encodeURIComponent(sessaoId)}/calibracao`,
    'POST',
    entrada,
  )
}

/** POST /api/sessoes/:id/repeticao — lote idempotente por `sequencia` (RNF-03). */
export function enviarLoteRepeticoes(
  sessaoId: string,
  entrada: LoteRepeticoesInput,
): Promise<{ aceitas: number; totalRepeticoesValidas: number }> {
  return pedirJson<{ aceitas: number; totalRepeticoesValidas: number }>(
    `/api/sessoes/${encodeURIComponent(sessaoId)}/repeticao`,
    'POST',
    entrada,
  )
}

/** PATCH /api/sessoes/:id com { acao: 'concluir' } — 409 sem repetições. */
export function concluirSessao(sessaoId: string): Promise<ResultadoSessaoDTO> {
  return pedirJson<ResultadoSessaoDTO>(`/api/sessoes/${encodeURIComponent(sessaoId)}`, 'PATCH', {
    acao: 'concluir',
  })
}

/** PATCH /api/sessoes/:id com { acao: 'abortar' }. */
export async function abortarSessao(sessaoId: string): Promise<SessaoDTO> {
  const corpo = await pedirJson<{ sessao: SessaoDTO }>(
    `/api/sessoes/${encodeURIComponent(sessaoId)}`,
    'PATCH',
    { acao: 'abortar' },
  )
  return corpo.sessao
}

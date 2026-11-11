/**
 * Auxiliares de HTTP para os Route Handlers: autenticação obrigatória,
 * leitura/validação de corpo com zod e conversão de erros para o envelope
 * `{ erro, campos? }` do contrato.
 */
import { randomUUID } from 'node:crypto'
import type { ZodType, ZodTypeDef } from 'zod'
import type { ErroDTO, UsuarioDTO } from '@/lib/domain/contratos'
import { obterUsuarioAtual } from './auth'

/** Erro de API com status e corpo já no formato do envelope do contrato. */
export class ErroApi extends Error {
  readonly status: number
  readonly corpo: ErroDTO
  /** Campos extras do envelope (ex.: `sessaoId` no 409 de sessão duplicada). */
  readonly extras?: Record<string, unknown>

  constructor(status: number, corpo: ErroDTO, extras?: Record<string, unknown>) {
    super(corpo.erro)
    this.status = status
    this.corpo = corpo
    this.extras = extras
  }
}

/**
 * Exige sessão válida (contrato: toda rota /api/** exige sessão, exceto
 * POST /api/auth/login e GET /api/health). Sem sessão → 401.
 */
export async function requireUsuario(): Promise<UsuarioDTO> {
  const usuario = await obterUsuarioAtual()
  if (!usuario) {
    throw new ErroApi(401, { erro: 'Autenticação necessária.' })
  }
  return usuario
}

/** Id determinístico por prefixo (`pac_…`, `ses_…`, `avl_…`, `rep_…`, `exe_…`). */
export function gerarId(prefixo: string): string {
  return `${prefixo}_${randomUUID()}`
}

/**
 * Lê e valida o corpo JSON com um schema zod. Corpo não-JSON ou inválido
 * vira 400; na falha de validação, `campos` traz a primeira mensagem por
 * campo (chave = caminho do campo no schema, `.` para junções).
 */
export async function lerCorpo<T>(request: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let bruto: unknown
  try {
    bruto = await request.json()
  } catch {
    throw new ErroApi(400, { erro: 'O corpo da requisição deve ser um JSON válido.' })
  }

  const resultado = schema.safeParse(bruto)
  if (!resultado.success) {
    const campos: Record<string, string> = {}
    for (const problema of resultado.error.issues) {
      const chave = problema.path.length > 0 ? problema.path.join('.') : '_'
      if (campos[chave] === undefined) campos[chave] = problema.message
    }
    throw new ErroApi(400, { erro: 'Dados inválidos.', campos })
  }
  return resultado.data
}

/** Converte um erro lançado por um handler na resposta do envelope. */
export function respostaErro(erro: unknown): Response {
  if (erro instanceof ErroApi) {
    return Response.json({ ...erro.corpo, ...(erro.extras ?? {}) }, { status: erro.status })
  }
  console.error('[api] erro inesperado:', erro)
  return Response.json({ erro: 'Erro interno inesperado.' }, { status: 500 })
}

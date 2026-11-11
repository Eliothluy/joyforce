/**
 * POST /api/auth/logout — exige sessão (regra geral do contrato); apaga a
 * SessaoAcesso no banco, invalida o cookie e responde 204.
 */
import { encerrarSessaoAtual } from '@/lib/server/auth'
import { requireUsuario, respostaErro } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(): Promise<Response> {
  try {
    await requireUsuario()
    await encerrarSessaoAtual()
    return new Response(null, { status: 204 })
  } catch (erro) {
    return respostaErro(erro)
  }
}

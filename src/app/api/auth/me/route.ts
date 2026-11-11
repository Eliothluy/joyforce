/** GET /api/auth/me — { usuario } do cookie atual ou 401. */
import { obterUsuarioAtual } from '@/lib/server/auth'
import { respostaErro } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const usuario = await obterUsuarioAtual()
    if (!usuario) {
      return Response.json({ erro: 'Autenticação necessária.' }, { status: 401 })
    }
    return Response.json({ usuario })
  } catch (erro) {
    return respostaErro(erro)
  }
}

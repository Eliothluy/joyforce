/**
 * GET   /api/sessoes/:id — SessaoDetalheDTO; 404 fora do escopo.
 * PATCH /api/sessoes/:id — SessaoAcaoInput: `concluir` (ResultadoSessaoDTO)
 * ou `abortar` ({ sessao }).
 */
import { sessaoAcaoSchema } from '@/lib/domain/contratos'
import { obterSessaoDetalhe } from '@/lib/server/consultas'
import { lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { abortarSessao, concluirSessao } from '@/lib/server/sessoes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params

    const detalhe = await obterSessaoDetalhe(usuario.id, id)
    if (!detalhe) {
      return Response.json({ erro: 'Sessão não encontrada.' }, { status: 404 })
    }
    return Response.json(detalhe)
  } catch (erro) {
    return respostaErro(erro)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params
    const entrada = await lerCorpo(request, sessaoAcaoSchema)

    if (entrada.acao === 'concluir') {
      const resultado = await concluirSessao(usuario.id, id)
      return Response.json(resultado)
    }
    const sessao = await abortarSessao(usuario.id, id)
    return Response.json({ sessao })
  } catch (erro) {
    return respostaErro(erro)
  }
}

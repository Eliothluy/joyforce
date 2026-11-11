/**
 * POST /api/sessoes/:id/calibracao — RF-03. Regra do contrato:
 * aceita = variacaoMax <= 50 (inclusive) && duracaoMs >= 2900.
 * Aceita → status EM_ANDAMENTO + calibracaoAceita; rejeitada mantém
 * PREPARANDO e responde 200 { aceita: false } (nova tentativa). Fora do
 * estado PREPARANDO → 409.
 */
import { calibracaoCreateSchema } from '@/lib/domain/contratos'
import { lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { registrarCalibracao } from '@/lib/server/sessoes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params
    const entrada = await lerCorpo(request, calibracaoCreateSchema)

    const resultado = await registrarCalibracao(usuario.id, id, entrada)
    return Response.json(resultado)
  } catch (erro) {
    return respostaErro(erro)
  }
}

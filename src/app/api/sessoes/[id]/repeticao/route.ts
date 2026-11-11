/**
 * POST /api/sessoes/:id/repeticao — lote de repetições (RNF-03). Idempotente
 * por `sequencia`: lote com sequência ≤ ultimaSequencia já processado é
 * ignorado (200, nada gravado). Grava as Repeticaos e recalcula os agregados
 * da sessão na MESMA transação. Fora de EM_ANDAMENTO → 409.
 */
import { loteRepeticoesSchema } from '@/lib/domain/contratos'
import { lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { registrarLoteRepeticoes } from '@/lib/server/sessoes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params
    const lote = await lerCorpo(request, loteRepeticoesSchema)

    const resultado = await registrarLoteRepeticoes(usuario.id, id, lote)
    return Response.json(resultado)
  } catch (erro) {
    return respostaErro(erro)
  }
}

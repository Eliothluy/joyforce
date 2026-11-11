/** GET /api/pacientes/:id — PacienteDetalheDTO; 404 quando inexistente ou fora do escopo. */
import { obterPacienteDetalhe } from '@/lib/server/consultas'
import { requireUsuario, respostaErro } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params

    const detalhe = await obterPacienteDetalhe(usuario.id, id)
    if (!detalhe) {
      return Response.json({ erro: 'Paciente não encontrado.' }, { status: 404 })
    }
    return Response.json(detalhe)
  } catch (erro) {
    return respostaErro(erro)
  }
}

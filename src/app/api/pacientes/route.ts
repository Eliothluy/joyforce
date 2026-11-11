/**
 * GET  /api/pacientes?q= — lista do fisioterapeuta logado, filtro por nome
 * (contains insensitive). Devolve PacienteListagemDTO[] (superconjunto do
 * PacienteDTO com a última sessão concluída e a tendência — ver
 * src/types/listagem.ts) dentro do envelope { pacientes }.
 *
 * POST /api/pacientes — cadastra paciente (RF-01). Validação zod → 400 com
 * `campos` por campo; em erro nada é gravado.
 */
import { pacienteCreateSchema } from '@/lib/domain/contratos'
import { mapearPaciente } from '@/lib/server/dto'
import { gerarId, lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { prisma } from '@/lib/server/prisma'
import { listarPacientes } from '@/lib/server/consultas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const q = new URL(request.url).searchParams.get('q') ?? undefined
    const pacientes = await listarPacientes(usuario.id, q)
    return Response.json({ pacientes })
  } catch (erro) {
    return respostaErro(erro)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const entrada = await lerCorpo(request, pacienteCreateSchema)

    const paciente = await prisma.paciente.create({
      data: {
        id: gerarId('pac'),
        nome: entrada.nome,
        // @db.Date: meia-noite UTC preserva o dia em AAAA-MM-DD.
        dataNascimento: new Date(`${entrada.dataNascimento}T00:00:00Z`),
        lesaoDiagnostico: entrada.lesaoDiagnostico,
        telefone: entrada.telefone,
        criadoPorId: usuario.id,
      },
    })

    return Response.json(mapearPaciente(paciente), { status: 201 })
  } catch (erro) {
    return respostaErro(erro)
  }
}

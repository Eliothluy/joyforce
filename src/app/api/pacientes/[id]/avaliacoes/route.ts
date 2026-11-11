/**
 * POST /api/pacientes/:id/avaliacoes — registra a avaliação INICIAL do
 * paciente (RF-04: paciente + data + 4 alcances; sessaoId opcional). Como o
 * tipo não vem no corpo, este endpoint existe para a linha de base: 409 se o
 * paciente já tiver INICIAL. Avaliações de ACOMPANHAMENTO nascem da conclusão
 * de sessões (PATCH /api/sessoes/:id).
 */
import { avaliacaoCreateSchema } from '@/lib/domain/contratos'
import { mapearAvaliacao } from '@/lib/server/dto'
import { ErroApi, gerarId, lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { prisma } from '@/lib/server/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const { id } = await params
    const entrada = await lerCorpo(request, avaliacaoCreateSchema)

    const paciente = await prisma.paciente.findFirst({
      where: { id, criadoPorId: usuario.id },
      select: { id: true },
    })
    if (!paciente) {
      throw new ErroApi(404, { erro: 'Paciente não encontrado.' })
    }

    const existente = await prisma.avaliacao.findFirst({
      where: { pacienteId: id, tipo: 'INICIAL' },
      select: { id: true },
    })
    if (existente) {
      throw new ErroApi(409, { erro: 'Este paciente já possui uma avaliação inicial.' })
    }

    if (entrada.sessaoId) {
      const sessao = await prisma.sessao.findFirst({
        where: { id: entrada.sessaoId, pacienteId: id },
        select: { id: true },
      })
      if (!sessao) {
        throw new ErroApi(400, {
          erro: 'Dados inválidos.',
          campos: { sessaoId: 'A sessão informada não pertence a este paciente.' },
        })
      }
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        id: gerarId('avl'),
        pacienteId: id,
        tipo: 'INICIAL',
        dataHora: entrada.dataHora ? new Date(entrada.dataHora) : new Date(),
        alcanceFrente: entrada.alcanceFrente,
        alcanceTras: entrada.alcanceTras,
        alcanceEsquerda: entrada.alcanceEsquerda,
        alcanceDireita: entrada.alcanceDireita,
        sessaoId: entrada.sessaoId ?? null,
      },
    })

    return Response.json(mapearAvaliacao(avaliacao), { status: 201 })
  } catch (erro) {
    return respostaErro(erro)
  }
}

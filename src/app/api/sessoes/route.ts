/**
 * POST /api/sessoes — cria Sessao PREPARANDO + Exercicio padrão
 * (FRENTE, zona -30..30, limiar 120, tempoMaxMs 10000). 409 com
 * { erro, sessaoId } se o paciente já tiver sessão ativa.
 */
import { z } from 'zod'
import { lerCorpo, requireUsuario, respostaErro } from '@/lib/server/http'
import { criarSessao } from '@/lib/server/sessoes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// O contrato não define schema de criação de sessão em contratos.ts
// (a entrada é só o pacienteId); o schema fica local nesta rota.
const sessaoCreateSchema = z.object({
  pacienteId: z.string().min(1, 'Informe o paciente da sessão.'),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const usuario = await requireUsuario()
    const entrada = await lerCorpo(request, sessaoCreateSchema)

    const detalhe = await criarSessao(usuario.id, entrada.pacienteId)
    return Response.json(detalhe, { status: 201 })
  } catch (erro) {
    return respostaErro(erro)
  }
}

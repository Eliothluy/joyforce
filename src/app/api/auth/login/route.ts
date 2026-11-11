/**
 * POST /api/auth/login — única rota de sessão pública junto de /api/health.
 * Credencial errada → 401 "E-mail ou senha inválidos." (mensagem fixa do
 * contrato, sem revelar qual dos dois falhou). Sucesso → { usuario } +
 * Set-Cookie httpOnly.
 */
import { compare } from 'bcryptjs'
import { loginSchema } from '@/lib/domain/contratos'
import { criarSessaoAcesso, definirCookieSessao } from '@/lib/server/auth'
import { lerCorpo, respostaErro } from '@/lib/server/http'
import { prisma } from '@/lib/server/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  try {
    const entrada = await lerCorpo(request, loginSchema)

    const usuario = await prisma.usuario.findUnique({ where: { email: entrada.email } })
    if (!usuario || !(await compare(entrada.senha, usuario.senhaHash))) {
      return Response.json({ erro: 'E-mail ou senha inválidos.' }, { status: 401 })
    }

    // Housekeeping: remove sessões expiradas pendentes.
    await prisma.sessaoAcesso.deleteMany({ where: { expiraEm: { lt: new Date() } } })

    const token = await criarSessaoAcesso(usuario.id)
    await definirCookieSessao(token)

    return Response.json({ usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } })
  } catch (erro) {
    return respostaErro(erro)
  }
}

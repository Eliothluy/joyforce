/**
 * Sessão de acesso do fisioterapeuta (contrato docs/CONTRATO-API.md §Auth).
 *
 * O cookie `joyforce_sessao` guarda o token puro (32 bytes base64url); o banco
 * guarda somente o hash SHA-256 do token. Validade de 8 h, httpOnly,
 * sameSite=lax, path=/ e secure em produção. Sempre em runtime Node.
 *
 * As funções de escrita de cookie só podem ser chamadas em Route Handlers ou
 * Server Actions; `obterUsuarioAtual()` (só leitura) também serve a layouts.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import type { UsuarioDTO } from '@/lib/domain/contratos'
import { prisma } from './prisma'

const NOME_COOKIE = 'joyforce_sessao'
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000
const BYTES_DO_TOKEN = 32

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(DURACAO_SESSAO_MS / 1000),
  }
}

/** Usuário logado a partir do cookie de sessão, ou null quando não há sessão válida. */
export async function obterUsuarioAtual(): Promise<UsuarioDTO | null> {
  const jar = await cookies()
  const token = jar.get(NOME_COOKIE)?.value
  if (!token) return null

  const sessao = await prisma.sessaoAcesso.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: true },
  })
  if (!sessao) return null
  if (sessao.expiraEm.getTime() <= Date.now()) return null

  return { id: sessao.usuario.id, nome: sessao.usuario.nome, email: sessao.usuario.email }
}

/** Gera um token novo, grava somente o hash no banco e devolve o token puro. */
export async function criarSessaoAcesso(usuarioId: string): Promise<string> {
  const token = randomBytes(BYTES_DO_TOKEN).toString('base64url')
  await prisma.sessaoAcesso.create({
    data: {
      id: `sesac_${randomUUID()}`,
      usuarioId,
      tokenHash: hashToken(token),
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
    },
  })
  return token
}

/** Grava o cookie de sessão (Route Handlers / Server Actions). */
export async function definirCookieSessao(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(NOME_COOKIE, token, opcoesCookie())
}

/** Apaga a sessão no banco e invalida o cookie. */
export async function encerrarSessaoAtual(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(NOME_COOKIE)?.value
  if (token) {
    await prisma.sessaoAcesso.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  jar.set(NOME_COOKIE, '', { ...opcoesCookie(), maxAge: 0 })
}

/**
 * Cliente Prisma em singleton (padrão do Next.js): em dev o módulo é
 * recarregado a cada mudança e, sem o cache em globalThis, cada recarga
 * abriria novas conexões com o Postgres.
 */
import { PrismaClient } from '@prisma/client'

const CHAVES_URL_BANCO = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
] as const

/**
 * Resolve a URL do banco aceitando `DATABASE_URL` ou variáveis geradas
 * automaticamente por integrações do Vercel/Supabase (`POSTGRES_PRISMA_URL`,
 * `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`). Se nenhuma existir, registra
 * apenas os nomes de ambiente/chaves relacionadas para diagnóstico seguro.
 */
function resolverUrlBanco(): string | undefined {
  for (const chave of CHAVES_URL_BANCO) {
    const valor = process.env[chave]?.trim()
    if (valor) return valor
  }

  const chavesRelacionadas = Object.keys(process.env)
    .filter((chave) => /DATABASE|POSTGRES|SUPABASE|PRISMA/i.test(chave))
    .sort()

  console.error('[prisma] URL do banco ausente no ambiente.', {
    nodeEnv: process.env.NODE_ENV ?? 'indefinido',
    vercelEnv: process.env.VERCEL_ENV ?? 'indefinido',
    chavesRelacionadas,
  })
  return undefined
}

function criarPrismaClient(): PrismaClient {
  const datasourceUrl = resolverUrlBanco()
  return datasourceUrl ? new PrismaClient({ datasourceUrl }) : new PrismaClient()
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? criarPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

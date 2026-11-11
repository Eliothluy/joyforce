/**
 * Cliente Prisma em singleton (padrão do Next.js): em dev o módulo é
 * recarregado a cada mudança e, sem o cache em globalThis, cada recarga
 * abriria novas conexões com o Postgres.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

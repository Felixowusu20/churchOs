import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  return new PrismaClient()
}

/** Dev HMR can keep an old PrismaClient missing newly generated models. */
function isStaleClient(client: PrismaClient) {
  const delegates = client as unknown as Record<string, { findMany?: unknown } | undefined>
  return (
    typeof delegates.eventCheckIn?.findMany !== 'function' ||
    typeof delegates.siteContent?.findMany !== 'function'
  )
}

const existing = globalForPrisma.prisma
if (existing && isStaleClient(existing)) {
  void existing.$disconnect().catch(() => undefined)
  globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Neon free tier can take a few seconds to wake; retry transient connection errors. */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
      const transient = code === 'P1001' || code === 'P1017' || code === 'P1008'
      if (!transient || i === attempts - 1) throw error
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastError
}

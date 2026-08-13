import { prisma, withDbRetry } from '@/lib/server/prisma'
import { env } from '@/lib/server/env'
import { json, prismaError } from '@/lib/server/http'

export async function GET() {
  try {
    const adminCount = await withDbRetry(() => prisma.admin.count())
    const registrationOpen = adminCount === 0 && env.openRegistration
    return json({
      hasAdmin: adminCount > 0,
      canRegister: registrationOpen,
      message: adminCount > 0
        ? 'An admin account already exists. Sign in instead.'
        : 'Create the first admin account to get started.',
    })
  } catch (err) {
    return prismaError(err)
  }
}

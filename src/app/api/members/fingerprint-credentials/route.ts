import { NextRequest } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json, prismaError } from '@/lib/server/http'

/** Credential ids for phone biometric check-in matching. */
export async function GET(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  try {
    const rows = await prisma.member.findMany({
      where: {
        fingerprintEnrolled: true,
        fingerprintCredentialId: { not: null },
        status: 'Active',
      },
      select: {
        memberCode: true,
        fullName: true,
        fingerprintCredentialId: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return json({
      credentials: rows
        .filter((r) => r.fingerprintCredentialId)
        .map((r) => ({
          memberCode: r.memberCode,
          name: r.fullName,
          credentialId: r.fingerprintCredentialId as string,
        })),
    })
  } catch (err) {
    return prismaError(err)
  }
}

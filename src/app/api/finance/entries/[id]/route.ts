import { NextRequest } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json, prismaError } from '@/lib/server/http'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { id } = await params

  try {
    await prisma.financeEntry.delete({ where: { id } })
    return json({ ok: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return error('Entry not found', 404)
    }
    return prismaError(err)
  }
}

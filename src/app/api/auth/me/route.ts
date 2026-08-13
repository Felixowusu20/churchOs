import { NextRequest } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId, publicAdmin } from '@/lib/server/auth'
import { error, json } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const admin = await prisma.admin.findUnique({ where: { id: adminId } })
  if (!admin) return error('Unauthorized', 401)
  return json({ admin: publicAdmin(admin) })
}

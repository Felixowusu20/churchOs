import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { hashPassword, publicAdmin, requireSuperAdmin } from '@/lib/server/auth'
import { defaultTitleForRole, SUB_ADMIN_ROLES } from '@/lib/roles'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const { response } = await requireSuperAdmin(req)
  if (response) return response

  try {
    const admins = await prisma.admin.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })
    return json({
      admins: admins.map(publicAdmin),
      roles: SUB_ADMIN_ROLES,
    })
  } catch (err) {
    return prismaError(err)
  }
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(['Secretary', 'Finance Minister', 'Organizer']),
  title: z.string().optional(),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { response } = await requireSuperAdmin(req)
  if (response) return response

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Invalid staff payload', 400, parsed.error.flatten())

  const email = parsed.data.email.trim().toLowerCase()

  try {
    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) return error('An account with this email already exists.', 409)

    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash: await hashPassword(parsed.data.password),
        fullName: parsed.data.fullName.trim(),
        role: parsed.data.role,
        title: parsed.data.title?.trim() || defaultTitleForRole(parsed.data.role),
        phone: parsed.data.phone?.trim() || '',
      },
    })

    return json({ admin: publicAdmin(admin) }, 201)
  } catch (err) {
    return prismaError(err)
  }
}

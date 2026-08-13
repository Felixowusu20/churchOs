import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { hashPassword, publicAdmin, requireSuperAdmin } from '@/lib/server/auth'
import { defaultTitleForRole, normalizeRole, SUB_ADMIN_ROLES } from '@/lib/roles'
import { error, json, prismaError } from '@/lib/server/http'

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().min(2).optional(),
  role: z.enum(['Secretary', 'Finance Minister', 'Organizer', 'Super Admin']).optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin: actor, response } = await requireSuperAdmin(req)
  if (response) return response
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error('Invalid staff payload', 400, parsed.error.flatten())

  try {
    const target = await prisma.admin.findUnique({ where: { id } })
    if (!target) return error('Staff account not found', 404)

    if (parsed.data.role === 'Super Admin' && normalizeRole(target.role) !== 'Super Admin') {
      return error('Promote to Super Admin is not allowed from CMS. Use database tools if needed.', 400)
    }

    if (
      normalizeRole(target.role) === 'Super Admin' &&
      parsed.data.role &&
      parsed.data.role !== 'Super Admin' &&
      target.id === actor!.id
    ) {
      return error('You cannot demote your own Super Admin account.', 400)
    }

    if (
      normalizeRole(target.role) === 'Super Admin' &&
      parsed.data.role &&
      parsed.data.role !== 'Super Admin'
    ) {
      const superCount = await prisma.admin.count({ where: { role: 'Super Admin' } })
      if (superCount <= 1) return error('At least one Super Admin must remain.', 400)
    }

    if (parsed.data.role && parsed.data.role !== 'Super Admin' && !SUB_ADMIN_ROLES.includes(parsed.data.role as typeof SUB_ADMIN_ROLES[number])) {
      return error('Invalid role', 400)
    }

    if (parsed.data.email) {
      const email = parsed.data.email.trim().toLowerCase()
      const clash = await prisma.admin.findFirst({
        where: { email, NOT: { id } },
      })
      if (clash) return error('An account with this email already exists.', 409)
    }

    const nextRole = parsed.data.role
    const admin = await prisma.admin.update({
      where: { id },
      data: {
        ...(parsed.data.email ? { email: parsed.data.email.trim().toLowerCase() } : {}),
        ...(parsed.data.fullName ? { fullName: parsed.data.fullName.trim() } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone.trim() } : {}),
        ...(nextRole
          ? {
              role: nextRole,
              title: parsed.data.title?.trim() || defaultTitleForRole(nextRole === 'Super Admin' ? 'Super Admin' : nextRole),
            }
          : {}),
        ...(parsed.data.title !== undefined && !nextRole ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
    })

    return json({ admin: publicAdmin(admin) })
  } catch (err) {
    return prismaError(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin: actor, response } = await requireSuperAdmin(req)
  if (response) return response
  const { id } = await params

  try {
    const target = await prisma.admin.findUnique({ where: { id } })
    if (!target) return error('Staff account not found', 404)
    if (target.id === actor!.id) return error('You cannot delete your own account.', 400)

    if (normalizeRole(target.role) === 'Super Admin') {
      const superCount = await prisma.admin.count({ where: { role: 'Super Admin' } })
      if (superCount <= 1) return error('At least one Super Admin must remain.', 400)
    }

    await prisma.admin.delete({ where: { id } })
    return json({ ok: true })
  } catch (err) {
    return prismaError(err)
  }
}

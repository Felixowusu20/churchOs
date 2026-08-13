import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { serializeDepartment, uniqueDepartmentSlug } from '@/lib/server/departments'
import { error, json, prismaError } from '@/lib/server/http'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  leaderName: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  color: z.string().optional(),
  bg: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { members: true, events: true } } },
    })
    if (!department) return error('Department not found', 404)
    return json({ department: serializeDepartment(department) })
  } catch (err) {
    return prismaError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error('Invalid department payload', 400, parsed.error.flatten())

  try {
    const current = await prisma.department.findUnique({ where: { id } })
    if (!current) return error('Department not found', 404)

    const nextName = parsed.data.name?.trim()
    if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
      const clash = await prisma.department.findFirst({
        where: { name: { equals: nextName, mode: 'insensitive' }, NOT: { id } },
      })
      if (clash) return error('A department with this name already exists.', 409)
    }

    const department = await prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id },
        data: {
          ...(nextName ? { name: nextName, slug: await uniqueDepartmentSlug(nextName, id) } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description.trim() } : {}),
          ...(parsed.data.leaderName !== undefined ? { leaderName: parsed.data.leaderName.trim() } : {}),
          ...(parsed.data.meetingDay !== undefined ? { meetingDay: parsed.data.meetingDay.trim() } : {}),
          ...(parsed.data.meetingTime !== undefined ? { meetingTime: parsed.data.meetingTime.trim() } : {}),
          ...(parsed.data.color ? { color: parsed.data.color } : {}),
          ...(parsed.data.bg ? { bg: parsed.data.bg } : {}),
          ...(parsed.data.status ? { status: parsed.data.status } : {}),
        },
        include: { _count: { select: { members: true, events: true } } },
      })

      if (nextName && nextName !== current.name) {
        await tx.member.updateMany({
          where: { departmentId: id },
          data: { department: nextName },
        })
      }

      return updated
    })

    return json({ department: serializeDepartment(department) })
  } catch (err) {
    return prismaError(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { id } = await params

  try {
    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { members: true, events: true } } },
    })
    if (!department) return error('Department not found', 404)

    await prisma.$transaction(async (tx) => {
      await tx.member.updateMany({
        where: { departmentId: id },
        data: { departmentId: null, department: 'General' },
      })
      await tx.churchEvent.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      })
      await tx.department.delete({ where: { id } })
    })

    return json({
      ok: true,
      reassignedMembers: department._count.members,
      unlinkedEvents: department._count.events,
    })
  } catch (err) {
    return prismaError(err)
  }
}

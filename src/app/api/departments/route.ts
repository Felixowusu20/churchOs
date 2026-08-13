import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { listDepartments, serializeDepartment, uniqueDepartmentSlug } from '@/lib/server/departments'
import { pickDepartmentStyle } from '@/lib/departments'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET() {
  try {
    const departments = await listDepartments()
    return json({ departments })
  } catch (err) {
    return prismaError(err)
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  leaderName: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  color: z.string().optional(),
  bg: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
})

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Invalid department payload', 400, parsed.error.flatten())

  const name = parsed.data.name.trim()
  const style = pickDepartmentStyle(name)

  try {
    const existing = await prisma.department.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existing) return error('A department with this name already exists.', 409)

    const department = await prisma.department.create({
      data: {
        name,
        slug: await uniqueDepartmentSlug(name),
        description: parsed.data.description?.trim() || '',
        leaderName: parsed.data.leaderName?.trim() || '',
        meetingDay: parsed.data.meetingDay?.trim() || '',
        meetingTime: parsed.data.meetingTime?.trim() || '',
        color: parsed.data.color || style.color,
        bg: parsed.data.bg || style.bg,
        status: parsed.data.status || 'Active',
      },
      include: { _count: { select: { members: true, events: true } } },
    })

    return json({ department: serializeDepartment(department) }, 201)
  } catch (err) {
    return prismaError(err)
  }
}

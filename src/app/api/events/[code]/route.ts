import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json, prismaError } from '@/lib/server/http'

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  type: z.string().min(1).optional(),
  dateLabel: z.string().min(1).optional(),
  timeLabel: z.string().min(1).optional(),
  venue: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  registered: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
  bg: z.string().optional(),
  status: z.enum(['Upcoming', 'Live', 'Completed']).optional(),
  biometric: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
})

async function findEvent(codeOrId: string) {
  return prisma.churchEvent.findFirst({
    where: { OR: [{ code: codeOrId }, { id: codeOrId }] },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  try {
    const event = await findEvent(code)
    if (!event) return error('Event not found', 404)
    return json({ event })
  } catch (err) {
    return prismaError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { code } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error('Invalid event payload', 400, parsed.error.flatten())

  try {
    const current = await findEvent(code)
    if (!current) return error('Event not found', 404)

    if (parsed.data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parsed.data.departmentId } })
      if (!dept) return error('Department not found', 400)
    }

    const event = await prisma.churchEvent.update({
      where: { id: current.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.type !== undefined ? { type: parsed.data.type.trim() } : {}),
        ...(parsed.data.dateLabel !== undefined ? { dateLabel: parsed.data.dateLabel.trim() } : {}),
        ...(parsed.data.timeLabel !== undefined ? { timeLabel: parsed.data.timeLabel.trim() } : {}),
        ...(parsed.data.venue !== undefined ? { venue: parsed.data.venue.trim() } : {}),
        ...(parsed.data.capacity !== undefined ? { capacity: parsed.data.capacity } : {}),
        ...(parsed.data.registered !== undefined ? { registered: parsed.data.registered } : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
        ...(parsed.data.bg !== undefined ? { bg: parsed.data.bg } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.biometric !== undefined ? { biometric: parsed.data.biometric } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
        ...(parsed.data.departmentId !== undefined ? { departmentId: parsed.data.departmentId } : {}),
      },
    })

    return json({ event })
  } catch (err) {
    return prismaError(err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { code } = await params

  try {
    const current = await findEvent(code)
    if (!current) return error('Event not found', 404)
    await prisma.churchEvent.delete({ where: { id: current.id } })
    return json({ ok: true })
  } catch (err) {
    return prismaError(err)
  }
}

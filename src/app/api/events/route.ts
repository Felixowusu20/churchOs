import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json, prismaError } from '@/lib/server/http'

function serializeEvent(event: {
  id: string
  code: string
  title: string
  type: string
  dateLabel: string
  timeLabel: string
  venue: string
  capacity: number
  registered: number
  color: string
  bg: string
  status: string
  biometric: boolean
  imageUrl: string | null
  departmentId: string | null
}) {
  return event
}

export async function GET() {
  try {
    const events = await prisma.churchEvent.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return json({ events: events.map(serializeEvent) })
  } catch (err) {
    return prismaError(err)
  }
}

const createSchema = z.object({
  title: z.string().min(2),
  type: z.string().min(1),
  dateLabel: z.string().min(1),
  timeLabel: z.string().min(1),
  venue: z.string().min(1),
  capacity: z.number().int().positive(),
  registered: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
  bg: z.string().optional(),
  status: z.enum(['Upcoming', 'Live', 'Completed']).optional(),
  biometric: z.boolean().optional(),
  imageUrl: z.string().optional(),
  departmentId: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Invalid event payload', 400, parsed.error.flatten())

  try {
    if (parsed.data.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: parsed.data.departmentId } })
      if (!dept) return error('Department not found', 400)
    }

    const count = await prisma.churchEvent.count()
    const code = `EVT-${String(count + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`

    const event = await prisma.churchEvent.create({
      data: {
        code,
        title: parsed.data.title.trim(),
        type: parsed.data.type.trim(),
        dateLabel: parsed.data.dateLabel.trim(),
        timeLabel: parsed.data.timeLabel.trim(),
        venue: parsed.data.venue.trim(),
        capacity: parsed.data.capacity,
        registered: parsed.data.registered ?? 0,
        color: parsed.data.color || '#1F2D4D',
        bg: parsed.data.bg || '#F0EBE3',
        status: parsed.data.status || 'Upcoming',
        biometric: parsed.data.biometric ?? false,
        imageUrl: parsed.data.imageUrl || null,
        departmentId: parsed.data.departmentId ?? null,
      },
    })

    return json({ event: serializeEvent(event) }, 201)
  } catch (err) {
    return prismaError(err)
  }
}

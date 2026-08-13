import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { serializeCheckIn } from '@/lib/server/reports'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  try {
    const eventCode = req.nextUrl.searchParams.get('event') || undefined
    const start = req.nextUrl.searchParams.get('start')
    const end = req.nextUrl.searchParams.get('end')

    const startAt = start ? new Date(`${start}T00:00:00.000`) : undefined
    const endAt = end ? new Date(`${end}T23:59:59.999`) : undefined

    const rows = await prisma.eventCheckIn.findMany({
      where: {
        ...(eventCode
          ? { event: { code: eventCode } }
          : {}),
        ...(startAt || endAt
          ? {
              checkedAt: {
                ...(startAt ? { gte: startAt } : {}),
                ...(endAt ? { lte: endAt } : {}),
              },
            }
          : {}),
      },
      include: { event: { select: { code: true, title: true } } },
      orderBy: { checkedAt: 'desc' },
      take: 5000,
    })

    return json({ checkIns: rows.map(serializeCheckIn) })
  } catch (err) {
    return prismaError(err)
  }
}

const createSchema = z.object({
  eventCode: z.string().min(1),
  memberCode: z.string().min(1),
  status: z.enum(['Present', 'Late']).optional(),
})

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Invalid check-in payload', 400, parsed.error.flatten())

  try {
    const event = await prisma.churchEvent.findUnique({
      where: { code: parsed.data.eventCode },
    })
    if (!event) return error('Event not found', 404)
    if (!event.biometric) return error('Biometric check-in is not enabled for this event', 400)

    const member = await prisma.member.findUnique({
      where: { memberCode: parsed.data.memberCode },
    })

    const memberName = member?.fullName || parsed.data.memberCode
    const department = member?.department || ''
    const status = parsed.data.status || 'Present'

    const existing = await prisma.eventCheckIn.findUnique({
      where: {
        eventId_memberCode: {
          eventId: event.id,
          memberCode: parsed.data.memberCode,
        },
      },
    })
    if (existing) {
      const withEvent = await prisma.eventCheckIn.findUniqueOrThrow({
        where: { id: existing.id },
        include: { event: { select: { code: true, title: true } } },
      })
      return json({
        checkIn: serializeCheckIn({ ...withEvent, avatarUrl: member?.avatarUrl }),
        alreadyCheckedIn: true,
        registered: event.registered,
        message: `${memberName} is already checked in for ${event.title}.`,
      })
    }

    const checkIn = await prisma.$transaction(async (tx) => {
      const created = await tx.eventCheckIn.create({
        data: {
          eventId: event.id,
          memberId: member?.id,
          memberCode: parsed.data.memberCode,
          memberName,
          department,
          status,
        },
        include: { event: { select: { code: true, title: true } } },
      })
      const updated = await tx.churchEvent.update({
        where: { id: event.id },
        data: { registered: { increment: 1 } },
      })
      return { created, registered: updated.registered }
    })

    return json(
      {
        checkIn: serializeCheckIn({ ...checkIn.created, avatarUrl: member?.avatarUrl }),
        alreadyCheckedIn: false,
        registered: checkIn.registered,
        message: `${memberName} checked in successfully.`,
      },
      201,
    )
  } catch (err) {
    return prismaError(err)
  }
}

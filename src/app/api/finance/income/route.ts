import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { serializeEntry } from '@/lib/server/finance'
import { roundMoney } from '@/lib/finance'
import { error, json, prismaError } from '@/lib/server/http'

const incomeSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().optional(),
  memberName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['Verified', 'Pending']).optional(),
  receiptUrl: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
})

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = incomeSchema.safeParse(body)
  if (!parsed.success) return error('Invalid income payload', 400, parsed.error.flatten())

  try {
    const entry = await prisma.financeEntry.create({
      data: {
        kind: 'INCOME',
        category: parsed.data.category.trim(),
        amount: roundMoney(parsed.data.amount),
        method: parsed.data.method?.trim() || 'Cash',
        memberName: parsed.data.memberName?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status || 'Verified',
        receiptUrl: parsed.data.receiptUrl?.trim() || null,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        createdById: adminId,
      },
    })

    return json({ entry: serializeEntry(entry) }, 201)
  } catch (err) {
    return prismaError(err)
  }
}

import { FinanceKind } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import {
  buildMonthlySeries,
  computeBalance,
  roundMoney,
  type FinanceEntry,
  type FinanceSummary,
} from '@/lib/finance'

function serializeEntry(row: {
  id: string
  kind: FinanceKind
  category: string
  amount: number
  method: string | null
  memberName: string | null
  description: string | null
  notes: string | null
  status: string
  approvedBy: string | null
  receiptUrl: string | null
  occurredAt: Date
}): FinanceEntry {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    amount: roundMoney(row.amount),
    method: row.method,
    memberName: row.memberName,
    description: row.description,
    notes: row.notes,
    status: row.status,
    approvedBy: row.approvedBy,
    receiptUrl: row.receiptUrl,
    occurredAt: row.occurredAt.toISOString(),
  }
}

/** Single source of truth for finance KPIs used by API + UI. */
export async function getFinanceSummary(): Promise<FinanceSummary> {
  const since = new Date()
  since.setMonth(since.getMonth() - 5)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const [incomeAgg, expenseAgg, byCategory, monthlyRows, recentRows] = await Promise.all([
    prisma.financeEntry.aggregate({
      where: { kind: 'INCOME' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financeEntry.aggregate({
      where: { kind: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financeEntry.groupBy({
      by: ['category', 'kind'],
      _sum: { amount: true },
      orderBy: { category: 'asc' },
    }),
    prisma.financeEntry.findMany({
      where: { occurredAt: { gte: since } },
      select: { kind: true, amount: true, occurredAt: true },
    }),
    prisma.financeEntry.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 8,
    }),
  ])

  const incomeTotal = roundMoney(incomeAgg._sum.amount ?? 0)
  const expenseTotal = roundMoney(expenseAgg._sum.amount ?? 0)

  return {
    incomeTotal,
    expenseTotal,
    balance: computeBalance(incomeTotal, expenseTotal),
    incomeCount: incomeAgg._count,
    expenseCount: expenseAgg._count,
    recordCount: incomeAgg._count + expenseAgg._count,
    byCategory: byCategory.map((row) => ({
      category: row.category,
      kind: row.kind,
      total: roundMoney(row._sum.amount ?? 0),
    })),
    monthly: buildMonthlySeries(monthlyRows, 6),
    recent: recentRows.map(serializeEntry),
  }
}

export async function listFinanceEntries(opts?: {
  kind?: FinanceKind
  category?: string
  q?: string
  take?: number
}) {
  const kind = opts?.kind
  const category = opts?.category
  const q = opts?.q?.trim() || ''

  const rows = await prisma.financeEntry.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(category && category !== 'All' ? { category } : {}),
      ...(q
        ? {
            OR: [
              { memberName: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
              { notes: { contains: q, mode: 'insensitive' as const } },
              { category: { contains: q, mode: 'insensitive' as const } },
              { approvedBy: { contains: q, mode: 'insensitive' as const } },
              { method: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    take: opts?.take ?? 500,
  })

  return rows.map(serializeEntry)
}

export { serializeEntry }

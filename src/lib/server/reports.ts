import { prisma } from '@/lib/server/prisma'
import {
  buildMonthlySeries,
  computeBalance,
  roundMoney,
  type FinanceCategoryTotal,
  type FinanceMonthRow,
} from '@/lib/finance'
import { serializeEntry } from '@/lib/server/finance'
import { serializeMember } from '@/lib/server/members'
import { serializeDepartment } from '@/lib/server/departments'

export type ReportDateRange = {
  start: string
  end: string
}

function parseDayBound(iso: string, endOfDay: boolean) {
  const day = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const d = new Date(`${day}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function resolveReportRange(start?: string | null, end?: string | null): ReportDateRange {
  const endDate = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : new Date().toISOString().slice(0, 10)
  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return { start, end: endDate }
  }
  const s = new Date(`${endDate}T12:00:00`)
  s.setMonth(s.getMonth() - 5)
  s.setDate(1)
  return { start: s.toISOString().slice(0, 10), end: endDate }
}

export function serializeCheckIn(row: {
  id: string
  memberCode: string
  memberName: string
  department: string
  status: string
  checkedAt: Date
  event: { code: string; title: string }
  avatarUrl?: string | null
}) {
  return {
    id: row.id,
    memberId: row.memberCode,
    name: row.memberName,
    dept: row.department,
    avatar: row.avatarUrl || '',
    status: row.status === 'Late' ? ('Late' as const) : ('Present' as const),
    eventId: row.event.code,
    eventTitle: row.event.title,
    at: row.checkedAt.getTime(),
    time: row.checkedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    checkedAt: row.checkedAt.toISOString(),
  }
}

export async function getReportBundle(range: ReportDateRange) {
  const startAt = parseDayBound(range.start, false)
  const endAt = parseDayBound(range.end, true)
  if (!startAt || !endAt) throw new Error('Invalid date range')

  const dateFilter = { gte: startAt, lte: endAt }

  const [
    financeRows,
    membersAll,
    membersJoined,
    events,
    checkIns,
    departments,
    incomeAgg,
    expenseAgg,
    byCategory,
    activeCount,
  ] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { occurredAt: dateFilter },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    }),
    prisma.member.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.member.findMany({
      where: { dateJoined: dateFilter },
      orderBy: { dateJoined: 'desc' },
    }),
    prisma.churchEvent.findMany({
      include: { _count: { select: { checkIns: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.eventCheckIn.findMany({
      where: { checkedAt: dateFilter },
      include: { event: { select: { code: true, title: true } } },
      orderBy: { checkedAt: 'desc' },
      take: 5000,
    }),
    prisma.department.findMany({
      include: { _count: { select: { members: true, events: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.financeEntry.aggregate({
      where: { kind: 'INCOME', occurredAt: dateFilter },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financeEntry.aggregate({
      where: { kind: 'EXPENSE', occurredAt: dateFilter },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financeEntry.groupBy({
      by: ['category', 'kind'],
      where: { occurredAt: dateFilter },
      _sum: { amount: true },
      orderBy: { category: 'asc' },
    }),
    prisma.member.count({ where: { status: 'Active' } }),
  ])

  const incomeTotal = roundMoney(incomeAgg._sum.amount ?? 0)
  const expenseTotal = roundMoney(expenseAgg._sum.amount ?? 0)
  const balance = computeBalance(incomeTotal, expenseTotal)

  const categoryTotals: FinanceCategoryTotal[] = byCategory.map((row) => ({
    category: row.category,
    kind: row.kind,
    total: roundMoney(row._sum.amount ?? 0),
  }))

  const monthly: FinanceMonthRow[] = buildMonthlySeries(
    financeRows.map((r) => ({ kind: r.kind, amount: r.amount, occurredAt: r.occurredAt })),
    6,
  )

  const entries = financeRows.map(serializeEntry)
  const membersJoinedSerialized = membersJoined.map(serializeMember)
  const baptisms = membersJoined.filter((m) => m.baptized).length

  return {
    range,
    kpis: {
      membersTotal: membersAll.length,
      membersActive: activeCount,
      membersJoined: membersJoined.length,
      baptisms,
      incomeTotal,
      expenseTotal,
      balance,
      incomeCount: incomeAgg._count,
      expenseCount: expenseAgg._count,
      checkIns: checkIns.length,
      eventsTotal: events.length,
      departmentsTotal: departments.length,
    },
    finance: {
      incomeTotal,
      expenseTotal,
      balance,
      entries,
      byCategory: categoryTotals,
      monthly,
    },
    members: {
      all: membersAll.map(serializeMember),
      joined: membersJoinedSerialized,
    },
    events: events.map((e) => ({
      id: e.code,
      dbId: e.id,
      title: e.title,
      type: e.type,
      date: e.dateLabel,
      time: e.timeLabel,
      venue: e.venue,
      capacity: e.capacity,
      registered: e.registered,
      status: e.status,
      biometric: e.biometric,
      departmentId: e.departmentId,
      checkInCount: e._count.checkIns,
    })),
    checkIns: checkIns.map(serializeCheckIn),
    departments: departments.map(serializeDepartment),
  }
}

export type ReportBundle = Awaited<ReturnType<typeof getReportBundle>>

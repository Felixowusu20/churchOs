/** Shared finance helpers — keep UI + API math consistent. */

export type FinanceKind = 'INCOME' | 'EXPENSE'

export type FinanceEntry = {
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
  occurredAt: string
}

export type FinanceCategoryTotal = {
  category: string
  kind: FinanceKind | string
  total: number
}

export type FinanceMonthRow = {
  key: string
  month: string
  income: number
  expenses: number
}

export type FinanceSummary = {
  incomeTotal: number
  expenseTotal: number
  balance: number
  incomeCount: number
  expenseCount: number
  recordCount: number
  byCategory: FinanceCategoryTotal[]
  monthly: FinanceMonthRow[]
  recent: FinanceEntry[]
}

export const incomeCategories = [
  'Tithe',
  'Offering',
  'Donation',
  'Thanksgiving',
  'Building Fund',
  'Welfare Fund',
] as const

export const expenseCategories = [
  'Personnel',
  'Utilities',
  'Programs',
  'Maintenance',
  'Other',
] as const

export const paymentMethods = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'] as const

export const pieColors = ['#1F2D4D', '#9A7B4F', '#2F6B4F', '#5B4B8A', '#8B5A6B', '#B54A3F']

/** Round to cents to avoid float drift in totals. */
export function roundMoney(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function parseAmount(raw: string | number) {
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n <= 0) return null
  return roundMoney(n)
}

export function formatMoney(n: number) {
  return roundMoney(n).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatMoneyCompact(n: number) {
  const v = roundMoney(n)
  if (Math.abs(v) >= 1000) {
    return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  }
  return formatMoney(v)
}

export function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function sumAmounts(entries: Pick<FinanceEntry, 'amount'>[]) {
  return roundMoney(entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0))
}

export function computeBalance(incomeTotal: number, expenseTotal: number) {
  return roundMoney(roundMoney(incomeTotal) - roundMoney(expenseTotal))
}

export function buildMonthlySeries(
  entries: { kind: string; amount: number; occurredAt: Date | string }[],
  months = 6,
): FinanceMonthRow[] {
  const now = new Date()
  const buckets: FinanceMonthRow[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({
      key,
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      income: 0,
      expenses: 0,
    })
  }

  const index = new Map(buckets.map((b) => [b.key, b]))
  for (const entry of entries) {
    const at = entry.occurredAt instanceof Date ? entry.occurredAt : new Date(entry.occurredAt)
    if (Number.isNaN(at.getTime())) continue
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`
    const bucket = index.get(key)
    if (!bucket) continue
    const amount = roundMoney(entry.amount)
    if (entry.kind === 'INCOME') bucket.income = roundMoney(bucket.income + amount)
    else if (entry.kind === 'EXPENSE') bucket.expenses = roundMoney(bucket.expenses + amount)
  }

  return buckets
}

export function incomeMix(byCategory: FinanceCategoryTotal[]) {
  const map = new Map<string, number>()
  for (const row of byCategory) {
    if (row.kind !== 'INCOME') continue
    map.set(row.category, roundMoney((map.get(row.category) || 0) + row.total))
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      color: pieColors[i % pieColors.length],
    }))
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, uploadImage, ApiError } from '../lib/api'
import { useAuth } from './AuthContext'
import { canAccessPage, financeAccessFor } from '../lib/roles'
import {
  computeBalance,
  parseAmount,
  sumAmounts,
  type FinanceEntry,
  type FinanceSummary,
} from '../lib/finance'

export type IncomeInput = {
  category: string
  amount: string | number
  method?: string
  memberName?: string
  notes?: string
  status?: 'Verified' | 'Pending'
  receiptFile?: File | null
  receiptUrl?: string
  occurredAt?: string
}

export type ExpenseInput = {
  category: string
  amount: string | number
  description: string
  approvedBy?: string
  notes?: string
  status?: 'Verified' | 'Pending'
  receiptFile?: File | null
  receiptUrl?: string
  occurredAt?: string
}

type FinanceContextValue = {
  summary: FinanceSummary | null
  entries: FinanceEntry[]
  loading: boolean
  error: string
  refresh: () => Promise<void>
  addIncome: (input: IncomeInput) => Promise<FinanceEntry>
  addExpense: (input: ExpenseInput) => Promise<FinanceEntry>
  removeEntry: (id: string) => Promise<void>
  /** Client-side reconciliation against loaded entries (capped list). */
  ledger: {
    incomeTotal: number
    expenseTotal: number
    balance: number
    incomeCount: number
    expenseCount: number
  }
}

const emptySummary = (): FinanceSummary => ({
  incomeTotal: 0,
  expenseTotal: 0,
  balance: 0,
  incomeCount: 0,
  expenseCount: 0,
  recordCount: 0,
  byCategory: [],
  monthly: [],
  recent: [],
})

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { token, admin } = useAuth()
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [entries, setEntries] = useState<FinanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!token || !admin) {
      setSummary(null)
      setEntries([])
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const access = financeAccessFor(admin.role)
      if (access === 'none') {
        setSummary(null)
        setEntries([])
        return
      }

      // Entry clerks need records; Super Admin + Secretary (reports) need summary.
      const needsEntries = access === 'full' || access === 'input'
      const needsSummary = access === 'full' || access === 'reports' || canAccessPage(admin.role, 'reports')

      if (needsEntries) {
        const list = await api<{ entries: FinanceEntry[] }>('/api/finance/entries')
        setEntries(list.entries)
      } else {
        setEntries([])
      }

      if (needsSummary) {
        const sum = await api<FinanceSummary>('/api/finance/summary')
        setSummary(sum)
      } else {
        setSummary(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load finance data')
      setSummary(null)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [token, admin])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addIncome = useCallback(async (input: IncomeInput) => {
    const amount = parseAmount(input.amount)
    if (amount == null) throw new ApiError(400, 'Enter a valid amount greater than zero')

    let receiptUrl = input.receiptUrl || undefined
    if (input.receiptFile) {
      const up = await uploadImage(input.receiptFile, 'receipts')
      receiptUrl = up.url
    }

    const res = await api<{ entry: FinanceEntry }>('/api/finance/income', {
      method: 'POST',
      json: {
        category: input.category,
        amount,
        method: input.method || 'Cash',
        memberName: input.memberName || undefined,
        notes: input.notes || undefined,
        status: input.status || 'Verified',
        receiptUrl,
        occurredAt: input.occurredAt,
      },
    })

    await refresh()
    return res.entry
  }, [refresh])

  const addExpense = useCallback(async (input: ExpenseInput) => {
    const amount = parseAmount(input.amount)
    if (amount == null) throw new ApiError(400, 'Enter a valid amount greater than zero')
    if (!input.description.trim()) throw new ApiError(400, 'Expense description is required')

    let receiptUrl = input.receiptUrl || undefined
    if (input.receiptFile) {
      const up = await uploadImage(input.receiptFile, 'receipts')
      receiptUrl = up.url
    }

    const res = await api<{ entry: FinanceEntry }>('/api/finance/expenses', {
      method: 'POST',
      json: {
        category: input.category,
        amount,
        description: input.description.trim(),
        approvedBy: input.approvedBy || undefined,
        notes: input.notes || undefined,
        status: input.status || 'Verified',
        receiptUrl,
        occurredAt: input.occurredAt,
      },
    })

    await refresh()
    return res.entry
  }, [refresh])

  const removeEntry = useCallback(async (id: string) => {
    await api(`/api/finance/entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await refresh()
  }, [refresh])

  const ledger = useMemo(() => {
    const income = entries.filter((e) => e.kind === 'INCOME')
    const expense = entries.filter((e) => e.kind === 'EXPENSE')
    const incomeTotal = sumAmounts(income)
    const expenseTotal = sumAmounts(expense)
    return {
      incomeTotal,
      expenseTotal,
      balance: computeBalance(incomeTotal, expenseTotal),
      incomeCount: income.length,
      expenseCount: expense.length,
    }
  }, [entries])

  const value = useMemo(
    () => ({
      summary: summary ?? (loading ? null : emptySummary()),
      entries,
      loading,
      error,
      refresh,
      addIncome,
      addExpense,
      removeEntry,
      ledger,
    }),
    [summary, entries, loading, error, refresh, addIncome, addExpense, removeEntry, ledger],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}

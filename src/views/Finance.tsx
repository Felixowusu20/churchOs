'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  DollarSign, Plus, Search, Upload, ArrowUpRight, ArrowDownRight, X, Trash2, RefreshCw, Eye,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ApiError } from '../lib/api'
import { useFinance } from '../context/FinanceContext'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { canViewFinanceDashboard } from '../lib/roles'
import {
  expenseCategories,
  formatEntryDate,
  formatMoney,
  incomeCategories,
  incomeMix,
  paymentMethods,
  parseAmount,
  type FinanceEntry,
} from '../lib/finance'

export default function Finance() {
  const { admin } = useAuth()
  const showDashboard = canViewFinanceDashboard(admin?.role)
  const {
    summary,
    entries,
    loading,
    error: loadError,
    refresh,
    addIncome,
    addExpense,
    removeEntry,
    ledger,
  } = useFinance()

  const [categoryFilter, setCategoryFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<FinanceEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [incomeForm, setIncomeForm] = useState({
    category: 'Tithe',
    amount: '',
    method: 'Cash',
    memberName: '',
    notes: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    category: 'Personnel',
    amount: '',
    description: '',
    approvedBy: '',
    notes: '',
  })
  const [incomeReceipt, setIncomeReceipt] = useState<File | null>(null)
  const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null)

  const displayError = error || loadError
  const totals = summary ?? {
    incomeTotal: ledger.incomeTotal,
    expenseTotal: ledger.expenseTotal,
    balance: ledger.balance,
    incomeCount: ledger.incomeCount,
    expenseCount: ledger.expenseCount,
    recordCount: ledger.incomeCount + ledger.expenseCount,
    byCategory: [],
    monthly: [],
    recent: [],
  }

  const pieData = useMemo(() => incomeMix(totals.byCategory), [totals.byCategory])

  const categories = useMemo(() => {
    const set = new Set<string>(['All', ...incomeCategories, ...expenseCategories])
    for (const e of entries) set.add(e.category)
    return [...set]
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false
      if (!q) return true
      const hay = [
        e.memberName,
        e.description,
        e.notes,
        e.category,
        e.method,
        e.approvedBy,
        e.status,
        e.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [entries, categoryFilter, search])

  const incomeEntries = useMemo(() => filtered.filter((e) => e.kind === 'INCOME'), [filtered])
  const expenseEntries = useMemo(() => filtered.filter((e) => e.kind === 'EXPENSE'), [filtered])

  const saveIncome = async () => {
    if (parseAmount(incomeForm.amount) == null) {
      setError('Enter a valid income amount greater than zero')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addIncome({ ...incomeForm, receiptFile: incomeReceipt })
      setShowIncome(false)
      setIncomeForm({ category: 'Tithe', amount: '', method: 'Cash', memberName: '', notes: '' })
      setIncomeReceipt(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save income')
    } finally {
      setSaving(false)
    }
  }

  const saveExpense = async () => {
    if (parseAmount(expenseForm.amount) == null) {
      setError('Enter a valid expense amount greater than zero')
      return
    }
    if (!expenseForm.description.trim()) {
      setError('Expense description is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await addExpense({ ...expenseForm, receiptFile: expenseReceipt })
      setShowExpense(false)
      setExpenseForm({ category: 'Personnel', amount: '', description: '', approvedBy: '', notes: '' })
      setExpenseReceipt(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save expense')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await removeEntry(deleteTarget.id)
      if (selected?.id === deleteTarget.id) setSelected(null)
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete record')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Finance</h2>
          {showDashboard && (
            <p className="text-sm text-[#8A91A0] mt-0.5">
              Live ledger — totals and logs stay in sync with the database
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 px-3 py-2.5 border border-[#E4E0DA] text-[#5C6578] rounded-md text-sm hover:bg-[#F8F6F3]"
            title="Refresh from database"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => { setExpenseReceipt(null); setShowExpense(true) }}
            className="px-4 py-2.5 border border-[#E4E0DA] text-[#5C6578] rounded-md text-sm hover:bg-[#F8F6F3]"
          >
            Log expense
          </button>
          <button
            type="button"
            onClick={() => { setIncomeReceipt(null); setShowIncome(true) }}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md"
          >
            <Plus size={16} /> Record income
          </button>
        </div>
      </div>

      {displayError && (
        <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
          {displayError}
        </div>
      )}

      {showDashboard && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total income', value: formatMoney(totals.incomeTotal), up: true, sub: `${totals.incomeCount} records` },
              { label: 'Total expenses', value: formatMoney(totals.expenseTotal), up: false, sub: `${totals.expenseCount} records` },
              { label: 'Net balance', value: formatMoney(totals.balance), up: totals.balance >= 0, sub: 'Income − expenses' },
              { label: 'All records', value: String(totals.recordCount), up: true, sub: 'Income + expenses' },
            ].map((c) => (
              <div key={c.label} className="panel rounded-lg p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-9 h-9 rounded-md bg-[#F5F0E8] flex items-center justify-center">
                    <DollarSign size={16} className="text-accent" />
                  </div>
                  {c.up ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className="text-danger" />}
                </div>
                <p className="text-xl font-semibold text-ink">{loading ? '…' : c.value}</p>
                <p className="text-xs text-[#8A91A0] mt-0.5">{c.label}</p>
                <p className="text-[11px] text-[#A8AEB8] mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 panel rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-ink text-sm">Income by category</h3>
                <span className="text-xs text-[#8A91A0]">{formatMoney(totals.incomeTotal)}</span>
              </div>
              <div className="space-y-3">
                {pieData.length === 0 && !loading && (
                  <p className="text-sm text-[#8A91A0]">No income recorded yet</p>
                )}
                {pieData.map((d) => {
                  const pct = totals.incomeTotal > 0 ? (d.value / totals.incomeTotal) * 100 : 0
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-[#5C6578]">{d.name}</span>
                        </div>
                        <span className="font-medium text-ink">{formatMoney(d.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#F0ECE7] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="panel rounded-lg p-5">
              <h3 className="font-medium text-ink text-sm mb-4">Income mix</h3>
              {pieData.length === 0 ? (
                <p className="text-sm text-[#8A91A0] py-10 text-center">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [formatMoney(Number(v || 0)), '']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      <div className="panel rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#E4E0DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-medium text-ink">Income records</h3>
            <p className="text-[11px] text-[#A8AEB8] mt-0.5">
              {incomeEntries.length} record{incomeEntries.length === 1 ? '' : 's'} · click a row for full details
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-[#E4E0DA] rounded-md px-3 py-2">
              <Search size={12} className="text-[#A8AEB8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records…"
                className="bg-transparent text-xs outline-none text-ink placeholder-[#A8AEB8] w-36"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field px-3 py-2 rounded-md text-xs text-ink"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F6F3] border-b border-[#E4E0DA]">
                <th className="text-left text-xs font-medium text-[#8A91A0] px-5 py-3">ID</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden sm:table-cell">Member</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden md:table-cell">Method</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[#8A91A0] px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {incomeEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#8A91A0]">
                    {loading ? 'Loading…' : 'No income entries'}
                  </td>
                </tr>
              ) : (
                incomeEntries.map((t) => (
                  <tr
                    key={t.id}
                    className="table-row-hover border-b border-[#F0ECE7] last:border-0 cursor-pointer"
                    onClick={() => setSelected(t)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] text-[#8A91A0]">{t.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-ink">{t.memberName || '—'}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-primary">{t.category}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-success">{formatMoney(t.amount)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-[#5C6578]">{t.method || '—'}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-[#8A91A0]">{formatEntryDate(t.occurredAt)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${t.status === 'Verified' ? 'bg-[#E8F2EC] text-success' : 'bg-[#F5F0E8] text-accent'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setSelected(t)} className="text-[#A8AEB8] hover:text-ink p-1" title="View details">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(t)} className="text-[#A8AEB8] hover:text-danger p-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel rounded-lg overflow-hidden">
        <div className="p-5 border-b border-[#E4E0DA]">
          <h3 className="font-medium text-ink">Expense records</h3>
          <p className="text-[11px] text-[#A8AEB8] mt-0.5">
            {expenseEntries.length} record{expenseEntries.length === 1 ? '' : 's'} · click a row for full details
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F6F3] border-b border-[#E4E0DA]">
                <th className="text-left text-xs font-medium text-[#8A91A0] px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden md:table-cell">Approved by</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Receipt</th>
                <th className="text-right text-xs font-medium text-[#8A91A0] px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {expenseEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#8A91A0]">
                    {loading ? 'Loading…' : 'No expense entries'}
                  </td>
                </tr>
              ) : (
                expenseEntries.map((e) => (
                  <tr
                    key={e.id}
                    className="table-row-hover border-b border-[#F0ECE7] last:border-0 cursor-pointer"
                    onClick={() => setSelected(e)}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-ink">{e.description || '—'}</td>
                    <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-[#5C6578]">{e.category}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-danger">−{formatMoney(e.amount)}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-[#5C6578]">{e.approvedBy || '—'}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-[#8A91A0]">{formatEntryDate(e.occurredAt)}</td>
                    <td className="px-4 py-3.5 text-xs" onClick={(ev) => ev.stopPropagation()}>
                      {e.receiptUrl ? (
                        <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                      ) : (
                        <span className="text-[#A8AEB8]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setSelected(e)} className="text-[#A8AEB8] hover:text-ink p-1" title="View details">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(e)} className="text-[#A8AEB8] hover:text-danger p-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-lg w-full max-w-lg border border-[#E4E0DA] shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E4E0DA] px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A91A0]">
                  {selected.kind === 'INCOME' ? 'Income record' : 'Expense record'}
                </p>
                <h3 className="font-display text-xl font-semibold text-ink mt-0.5">
                  {selected.kind === 'INCOME'
                    ? selected.category
                    : selected.description || selected.category}
                </h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-[#8A91A0] hover:text-ink p-1">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <DetailRow label="Amount">
                <span className={selected.kind === 'INCOME' ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                  {selected.kind === 'EXPENSE' ? '−' : ''}{formatMoney(selected.amount)}
                </span>
              </DetailRow>
              <DetailRow label="Category">{selected.category}</DetailRow>
              <DetailRow label="Status">{selected.status}</DetailRow>
              <DetailRow label="Date">{formatEntryDate(selected.occurredAt)}</DetailRow>
              {selected.kind === 'INCOME' && (
                <>
                  <DetailRow label="Member">{selected.memberName || '—'}</DetailRow>
                  <DetailRow label="Method">{selected.method || '—'}</DetailRow>
                </>
              )}
              {selected.kind === 'EXPENSE' && (
                <>
                  <DetailRow label="Description">{selected.description || '—'}</DetailRow>
                  <DetailRow label="Approved by">{selected.approvedBy || '—'}</DetailRow>
                </>
              )}
              <DetailRow label="Notes">{selected.notes || '—'}</DetailRow>
              <DetailRow label="Receipt">
                {selected.receiptUrl ? (
                  <a href={selected.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">
                    Open receipt
                  </a>
                ) : (
                  'None'
                )}
              </DetailRow>
              <DetailRow label="Record ID">
                <span className="font-mono text-xs">{selected.id}</span>
              </DetailRow>
            </div>
            <div className="sticky bottom-0 bg-[#F8F6F3] border-t border-[#E4E0DA] px-5 py-4 flex gap-2">
              <button type="button" onClick={() => setSelected(null)} className="flex-1 py-2.5 border border-[#E4E0DA] bg-white rounded-md text-sm">
                Close
              </button>
              <button
                type="button"
                onClick={() => { setDeleteTarget(selected) }}
                className="flex-1 py-2.5 rounded-md text-sm font-medium text-white bg-danger hover:opacity-90"
              >
                Delete record
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncome && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-[#E4E0DA]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold text-ink">Record income</h3>
              <button type="button" onClick={() => setShowIncome(false)} className="text-[#8A91A0]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Member (optional)</label>
                <input
                  value={incomeForm.memberName}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, memberName: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  placeholder="Member name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Category</label>
                <select
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                >
                  {incomeCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1">Amount</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1">Method</label>
                  <select
                    value={incomeForm.method}
                    onChange={(e) => setIncomeForm((f) => ({ ...f, method: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  >
                    {paymentMethods.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Receipt image</label>
                <label className="border border-dashed border-[#D4CFC7] rounded-md p-4 text-center cursor-pointer hover:bg-[#F8F6F3] block">
                  <Upload size={18} className="text-[#A8AEB8] mx-auto mb-1" />
                  <p className="text-xs text-[#8A91A0]">{incomeReceipt ? incomeReceipt.name : 'Upload to Cloudinary'}</p>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setIncomeReceipt(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowIncome(false)} className="flex-1 py-2.5 border border-[#E4E0DA] rounded-md text-sm">Cancel</button>
              <button type="button" disabled={saving || !incomeForm.amount} onClick={() => void saveIncome()} className="flex-1 btn-primary py-2.5 text-sm font-medium rounded-md disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpense && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md border border-[#E4E0DA]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold text-ink">Log expense</h3>
              <button type="button" onClick={() => setShowExpense(false)} className="text-[#8A91A0]"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Description</label>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  >
                    {expenseCategories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1">Amount</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Approved by</label>
                <input
                  value={expenseForm.approvedBy}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, approvedBy: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1">Receipt image</label>
                <label className="border border-dashed border-[#D4CFC7] rounded-md p-4 text-center cursor-pointer hover:bg-[#F8F6F3] block">
                  <Upload size={18} className="text-[#A8AEB8] mx-auto mb-1" />
                  <p className="text-xs text-[#8A91A0]">{expenseReceipt ? expenseReceipt.name : 'Upload to Cloudinary'}</p>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setExpenseReceipt(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setShowExpense(false)} className="flex-1 py-2.5 border border-[#E4E0DA] rounded-md text-sm">Cancel</button>
              <button
                type="button"
                disabled={saving || !expenseForm.amount || !expenseForm.description}
                onClick={() => void saveExpense()}
                className="flex-1 btn-primary py-2.5 text-sm font-medium rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete finance record?"
        message={
          deleteTarget
            ? `Remove this ${deleteTarget.kind === 'INCOME' ? 'income' : 'expense'} entry of ${formatMoney(deleteTarget.amount)}?`
            : ''
        }
        detail="This cannot be undone."
        confirmLabel="Delete record"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#F0ECE7] last:border-0">
      <p className="text-xs text-[#8A91A0] shrink-0 pt-0.5">{label}</p>
      <div className="text-sm text-ink text-right break-words min-w-0">{children}</div>
    </div>
  )
}

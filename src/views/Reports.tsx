'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Download, FileText, BarChart3, TrendingUp, Users, DollarSign,
  Calendar, Filter, Check, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { api, ApiError } from '../lib/api'
import { formatMoney, incomeMix } from '../lib/finance'
import {
  defaultDateRange,
  downloadCsv,
  kpiHtml,
  openPrintableReport,
  rangeLabel,
  tableHtml,
  type DateRange,
} from '../lib/reports'
import type { FinanceEntry, FinanceMonthRow } from '../lib/finance'
import type { DepartmentRecord } from '../lib/departments'

type ReportId =
  | 'attendance'
  | 'financial'
  | 'membership'
  | 'events'
  | 'departments'
  | 'annual'

type ReportMember = {
  id: string
  name: string
  gender: string
  dept: string
  teachingClass: string
  status: string
  baptized: boolean
  dateJoined: string
  phone: string
}

type ReportEvent = {
  id: string
  title: string
  type: string
  date: string
  venue: string
  status: string
  capacity: number
  checkInCount: number
  biometric: boolean
}

type ReportCheckIn = {
  id: string
  memberId: string
  name: string
  dept: string
  status: string
  eventId: string
  eventTitle: string
  at: number
  checkedAt: string
}

type ReportBundle = {
  range: DateRange
  kpis: {
    membersTotal: number
    membersActive: number
    membersJoined: number
    baptisms: number
    incomeTotal: number
    expenseTotal: number
    balance: number
    incomeCount: number
    expenseCount: number
    checkIns: number
    eventsTotal: number
    departmentsTotal: number
  }
  finance: {
    incomeTotal: number
    expenseTotal: number
    balance: number
    entries: FinanceEntry[]
    byCategory: { category: string; kind: string; total: number }[]
    monthly: FinanceMonthRow[]
  }
  members: {
    all: ReportMember[]
    joined: ReportMember[]
  }
  events: ReportEvent[]
  checkIns: ReportCheckIn[]
  departments: DepartmentRecord[]
}

const reportTemplates: {
  id: ReportId
  title: string
  desc: string
  icon: typeof Users
  color: string
}[] = [
  { id: 'attendance', title: 'Monthly Attendance Report', desc: 'Check-in log by member and department for the selected range', icon: Users, color: '#1E3A8A' },
  { id: 'financial', title: 'Financial Statement', desc: 'Income, expenses, and net balance from the live ledger', icon: DollarSign, color: '#059669' },
  { id: 'membership', title: 'Membership Growth Report', desc: 'Members joined, baptisms, and active vs inactive status', icon: TrendingUp, color: '#F59E0B' },
  { id: 'events', title: 'Event Attendance Report', desc: 'Events with fingerprint check-in counts and capacity', icon: Calendar, color: '#7C3AED' },
  { id: 'departments', title: 'Department Activity Report', desc: 'Ministry teams with linked members and events', icon: BarChart3, color: '#0891B2' },
  { id: 'annual', title: 'Annual Church Review', desc: 'Combined summary across members, finance, and events', icon: FileText, color: '#DC2626' },
]

export default function Reports() {
  const [range, setRange] = useState<DateRange>(defaultDateRange)
  const [draftRange, setDraftRange] = useState<DateRange>(defaultDateRange)
  const [showRange, setShowRange] = useState(false)
  const [data, setData] = useState<ReportBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const loadReport = useCallback(async (nextRange: DateRange) => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ start: nextRange.start, end: nextRange.end })
      const report = await api<ReportBundle>(`/api/reports?${qs}`)
      setData(report)
    } catch (err) {
      setData(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load reports from the database')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReport(range)
  }, [range, loadReport])

  const applyRange = () => {
    setRange(draftRange)
    setShowRange(false)
  }

  const mix = incomeMix(data?.finance.byCategory || [])
  const monthly = data?.finance.monthly || []
  const deptBars = (data?.departments || []).map((d) => ({
    name: d.name.length > 12 ? `${d.name.slice(0, 11)}…` : d.name,
    members: d.memberCount,
    events: d.eventCount,
  }))

  const kpis = data
    ? [
        { label: 'Members on record', value: data.kpis.membersTotal.toLocaleString(), trend: `${data.kpis.membersActive} active`, up: true },
        { label: 'Joined in range', value: String(data.kpis.membersJoined), trend: rangeLabel(range), up: true },
        { label: 'Income in range', value: formatMoney(data.kpis.incomeTotal), trend: `${data.kpis.incomeCount} entries`, up: true },
        { label: 'Expenses in range', value: formatMoney(data.kpis.expenseTotal), trend: `${data.kpis.expenseCount} entries`, up: false },
        { label: 'Net in range', value: formatMoney(data.kpis.balance), trend: 'Income − expenses', up: data.kpis.balance >= 0 },
        { label: 'Check-ins in range', value: String(data.kpis.checkIns), trend: `${data.kpis.eventsTotal} events total`, up: true },
      ]
    : []

  const buildReport = (id: ReportId, bundle: ReportBundle) => {
    const period = rangeLabel(bundle.range)
    const { finance, members, events, checkIns, departments, kpis: k } = bundle

    switch (id) {
      case 'attendance': {
        const rows = checkIns.map((c) => ({
          Time: new Date(c.at || c.checkedAt).toLocaleString(),
          Member: c.name,
          'Member ID': c.memberId,
          Department: c.dept,
          Event: c.eventTitle,
          Status: c.status,
        }))
        const html = `
          ${kpiHtml([
            { label: 'Check-ins', value: String(checkIns.length) },
            { label: 'Period', value: period },
          ])}
          <h2>Check-in log</h2>
          ${tableHtml(
            ['Time', 'Member', 'Department', 'Event', 'Status'],
            checkIns.map((c) => [
              new Date(c.at || c.checkedAt).toLocaleString(),
              c.name,
              c.dept,
              c.eventTitle,
              c.status,
            ]),
          )}`
        return { title: 'Monthly Attendance Report', filename: 'attendance-report', rows, html }
      }
      case 'financial': {
        const rows = finance.entries.map((e) => ({
          Date: e.occurredAt.slice(0, 10),
          Kind: e.kind,
          Category: e.category,
          Amount: e.amount,
          Member: e.memberName || '',
          Description: e.description || '',
          Method: e.method || '',
          Status: e.status,
          Notes: e.notes || '',
        }))
        const html = `
          ${kpiHtml([
            { label: 'Income', value: formatMoney(finance.incomeTotal) },
            { label: 'Expenses', value: formatMoney(finance.expenseTotal) },
            { label: 'Net balance', value: formatMoney(finance.balance) },
            { label: 'Period', value: period },
          ])}
          <h2>Ledger entries</h2>
          ${tableHtml(
            ['Date', 'Kind', 'Category', 'Amount', 'Details', 'Status'],
            finance.entries.map((e) => [
              e.occurredAt.slice(0, 10),
              e.kind,
              e.category,
              formatMoney(e.amount),
              e.memberName || e.description || e.method || '—',
              e.status,
            ]),
          )}`
        return { title: 'Financial Statement', filename: 'financial-statement', rows, html }
      }
      case 'membership': {
        const rows = members.joined.map((m) => ({
          'Member ID': m.id,
          Name: m.name,
          Gender: m.gender,
          Department: m.dept,
          Class: m.teachingClass,
          Status: m.status,
          Baptized: m.baptized ? 'Yes' : 'No',
          'Date joined': m.dateJoined,
          Phone: m.phone,
        }))
        const html = `
          ${kpiHtml([
            { label: 'Joined in period', value: String(k.membersJoined) },
            { label: 'Baptized', value: String(k.baptisms) },
            { label: 'Active members', value: String(k.membersActive) },
            { label: 'Total on record', value: String(k.membersTotal) },
          ])}
          <h2>Members joined</h2>
          ${tableHtml(
            ['ID', 'Name', 'Department', 'Status', 'Baptized', 'Joined'],
            members.joined.map((m) => [m.id, m.name, m.dept, m.status, m.baptized ? 'Yes' : 'No', m.dateJoined]),
          )}`
        return { title: 'Membership Growth Report', filename: 'membership-growth', rows, html }
      }
      case 'events': {
        const rows = events.map((e) => ({
          Code: e.id,
          Title: e.title,
          Type: e.type,
          Date: e.date,
          Venue: e.venue,
          Status: e.status,
          Capacity: e.capacity,
          'Check-ins': e.checkInCount,
          Biometric: e.biometric ? 'Yes' : 'No',
        }))
        const html = `
          ${kpiHtml([
            { label: 'Events', value: String(events.length) },
            { label: 'Check-ins (range)', value: String(checkIns.length) },
          ])}
          <h2>Events</h2>
          ${tableHtml(
            ['Code', 'Title', 'Type', 'Date', 'Status', 'Check-ins', 'Capacity'],
            events.map((e) => [e.id, e.title, e.type, e.date, e.status, e.checkInCount, e.capacity]),
          )}`
        return { title: 'Event Attendance Report', filename: 'event-attendance', rows, html }
      }
      case 'departments': {
        const rows = departments.map((d) => ({
          Department: d.name,
          Leader: d.leaderName || '',
          Status: d.status,
          Members: d.memberCount,
          Events: d.eventCount,
          Meeting: [d.meetingDay, d.meetingTime].filter(Boolean).join(' ') || '',
        }))
        const html = `
          ${kpiHtml([
            { label: 'Departments', value: String(departments.length) },
            { label: 'Members linked', value: String(members.all.filter((m) => m.dept && m.dept !== 'General').length) },
          ])}
          <h2>Departments</h2>
          ${tableHtml(
            ['Department', 'Leader', 'Members', 'Events', 'Status'],
            departments.map((d) => [d.name, d.leaderName || '—', d.memberCount, d.eventCount, d.status]),
          )}`
        return { title: 'Department Activity Report', filename: 'department-activity', rows, html }
      }
      case 'annual':
      default: {
        const rows = [
          { Section: 'Members', Metric: 'Total', Value: k.membersTotal },
          { Section: 'Members', Metric: 'Active', Value: k.membersActive },
          { Section: 'Members', Metric: 'Joined in range', Value: k.membersJoined },
          { Section: 'Finance', Metric: 'Income', Value: k.incomeTotal },
          { Section: 'Finance', Metric: 'Expenses', Value: k.expenseTotal },
          { Section: 'Finance', Metric: 'Net', Value: k.balance },
          { Section: 'Events', Metric: 'Total events', Value: k.eventsTotal },
          { Section: 'Events', Metric: 'Check-ins in range', Value: k.checkIns },
          { Section: 'Departments', Metric: 'Teams', Value: k.departmentsTotal },
        ]
        const html = `
          ${kpiHtml([
            { label: 'Members', value: String(k.membersTotal) },
            { label: 'Net finance', value: formatMoney(k.balance) },
            { label: 'Events', value: String(k.eventsTotal) },
            { label: 'Departments', value: String(k.departmentsTotal) },
          ])}
          <h2>Period</h2>
          <p class="muted">${period}</p>
          <h2>Summary metrics</h2>
          ${tableHtml(
            ['Section', 'Metric', 'Value'],
            rows.map((r) => [r.Section, r.Metric, r.Value]),
          )}`
        return { title: 'Annual Church Review', filename: 'annual-church-review', rows, html }
      }
    }
  }

  const ensureData = async () => {
    const qs = new URLSearchParams({ start: range.start, end: range.end })
    const report = await api<ReportBundle>(`/api/reports?${qs}`)
    setData(report)
    return report
  }

  const runTemplate = async (id: ReportId, mode: 'csv' | 'print') => {
    setBusy(`${id}-${mode}`)
    try {
      const bundle = await ensureData()
      const report = buildReport(id, bundle)
      if (mode === 'csv') {
        downloadCsv(`${report.filename}-${range.start}-to-${range.end}.csv`, report.rows)
        flash(`${report.title} downloaded from database`)
      } else {
        const ok = openPrintableReport(report.title, report.html)
        flash(ok ? `${report.title} opened for print / PDF` : 'Allow pop-ups to print or save as PDF')
      }
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Could not load report from database')
    } finally {
      setBusy(null)
    }
  }

  const exportAll = async (kind: 'csv' | 'excel' | 'pdf' | 'print') => {
    setBusy(kind)
    try {
      const bundle = await ensureData()
      if (kind === 'csv') {
        const financial = buildReport('financial', bundle)
        downloadCsv(`churchos-ledger-${range.start}-to-${range.end}.csv`, financial.rows)
        flash('Ledger CSV downloaded from database')
        return
      }
      if (kind === 'excel') {
        const annual = buildReport('annual', bundle)
        downloadCsv(`churchos-summary-${range.end}.csv`, annual.rows)
        flash('Summary spreadsheet downloaded from database')
        return
      }
      const annual = buildReport('annual', bundle)
      const financial = buildReport('financial', bundle)
      const membership = buildReport('membership', bundle)
      const eventsReport = buildReport('events', bundle)
      const body = `
        ${annual.html}
        <h2>Financial statement</h2>
        ${financial.html}
        <h2>Membership</h2>
        ${membership.html}
        <h2>Events</h2>
        ${eventsReport.html}
      `
      const ok = openPrintableReport('ChurchOS Export Report', body)
      flash(ok ? (kind === 'pdf' ? 'Use the print dialog → Save as PDF' : 'Print view opened') : 'Allow pop-ups to continue')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Could not export from database')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Reports & analytics</h2>
          <p className="text-sm text-[#8A91A0]">
            Database · {rangeLabel(range)}
            {loading ? ' · refreshing…' : ''}
          </p>
        </div>
        <div className="flex gap-3 relative">
          <button
            type="button"
            onClick={() => {
              setDraftRange(range)
              setShowRange((v) => !v)
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#E4E0DA] text-[#5C6578] rounded-md text-sm hover:bg-[#F8F6F3]"
          >
            <Filter size={14} /> Date range
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || loading}
            onClick={() => void exportAll('pdf')}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md disabled:opacity-50"
          >
            <Download size={14} /> Export report
          </button>

          {showRange && (
            <div className="absolute right-0 top-12 z-20 w-72 panel rounded-lg p-4 shadow-lg border border-[#E4E0DA] bg-white">
              <p className="text-xs font-medium text-ink mb-3">Filter report period</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#8A91A0] mb-1">Start</label>
                  <input
                    type="date"
                    value={draftRange.start}
                    onChange={(e) => setDraftRange((r) => ({ ...r, start: e.target.value }))}
                    className="input-field w-full px-3 py-2 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#8A91A0] mb-1">End</label>
                  <input
                    type="date"
                    value={draftRange.end}
                    min={draftRange.start || undefined}
                    onChange={(e) => setDraftRange((r) => ({ ...r, end: e.target.value }))}
                    className="input-field w-full px-3 py-2 rounded-md text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftRange(defaultDateRange())}
                    className="flex-1 py-2 text-xs border border-[#E4E0DA] rounded-md"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyRange}
                    className="flex-1 py-2 text-xs btn-primary rounded-md"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="rounded-md bg-[#E8F2EC] border border-[#C5DCCE] px-3 py-2.5 text-xs text-success flex items-center gap-2">
          <Check size={14} /> {toast}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-[#FBEAEA] border border-[#F0C9C9] px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="panel rounded-lg p-10 flex items-center justify-center gap-2 text-sm text-[#8A91A0]">
          <Loader2 size={16} className="animate-spin" /> Loading reports from database…
        </div>
      )}

      <div className="panel rounded-lg p-5">
        <h3 className="font-medium text-ink mb-4">Report templates</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reportTemplates.map((r) => (
            <div key={r.id} className="rounded-md border border-[#E4E0DA] p-3.5 hover:border-[#D4CFC7] hover:bg-[#F8F6F3] transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: `${r.color}15` }}>
                  <r.icon size={16} color={r.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">{r.title}</p>
                  <p className="text-[11px] text-[#8A91A0] mt-0.5">{r.desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy) || loading}
                  onClick={() => void runTemplate(r.id, 'csv')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md border border-[#E4E0DA] text-[11px] font-medium text-[#5C6578] hover:bg-white disabled:opacity-50"
                >
                  <Download size={12} /> CSV
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy) || loading}
                  onClick={() => void runTemplate(r.id, 'print')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md bg-primary text-white text-[11px] font-medium disabled:opacity-50"
                >
                  <FileText size={12} /> Print / PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-medium text-ink text-sm">Department membership</h3>
            <p className="text-[#8A91A0] text-xs">Live from database</p>
          </div>
          {deptBars.length === 0 ? (
            <p className="text-sm text-[#8A91A0] py-10 text-center">No departments yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptBars} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }} />
                <Bar dataKey="members" fill="#1F2D4D" radius={[4, 4, 0, 0]} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-medium text-ink text-sm">Income vs expenses</h3>
            <p className="text-[#8A91A0] text-xs">Selected period · database ledger</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }}
                formatter={(v) => [formatMoney(Number(v || 0)), '']}
              />
              <Bar dataKey="income" fill="#1F2D4D" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#9A7B4F" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="panel rounded-lg p-5">
          <h3 className="font-medium text-ink text-sm mb-4">Income mix (in range)</h3>
          {mix.length === 0 ? (
            <p className="text-sm text-[#8A91A0] py-8 text-center">No income in this period</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={mix} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={2}>
                    {mix.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatMoney(Number(v || 0)), '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {mix.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-[#5C6578] truncate max-w-28">{d.name}</span>
                    </div>
                    <span className="text-xs font-medium text-ink">{formatMoney(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2 panel rounded-lg p-5">
          <h3 className="font-medium text-ink text-sm mb-4">Key performance metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((m) => (
              <div key={m.label} className="p-3 bg-[#F8F6F3] rounded-md">
                <p className="text-xs text-[#8A91A0] mb-1">{m.label}</p>
                <p className="text-base font-semibold text-ink">{m.value}</p>
                <p className={`text-xs font-medium mt-0.5 ${m.up ? 'text-success' : 'text-danger'}`}>
                  {m.trend}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel rounded-lg p-5">
        <h3 className="font-medium text-ink mb-4">Export options</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'PDF Report', kind: 'pdf' as const },
            { label: 'Excel Spreadsheet', kind: 'excel' as const },
            { label: 'CSV Data', kind: 'csv' as const },
            { label: 'Print View', kind: 'print' as const },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              disabled={Boolean(busy) || loading}
              onClick={() => void exportAll(opt.kind)}
              className="flex items-center gap-2 px-5 py-2.5 border border-[#E4E0DA] text-[#3D4555] rounded-md text-sm font-medium hover:bg-[#F8F6F3] disabled:opacity-50"
            >
              <Download size={14} className="text-[#A8AEB8]" /> {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

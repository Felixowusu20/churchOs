'use client'

import { useMemo } from 'react'
import {
  Users, Fingerprint, DollarSign, TrendingDown,
  Calendar, Plus, FileText, ChevronRight,
  Building2
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useCheckIn } from '../context/CheckInContext'
import { useFinance } from '../context/FinanceContext'
import { useMembers } from '../context/MembersContext'
import { localAvatar } from '../lib/avatars'
import { formatMoney } from '../lib/finance'

interface DashboardHomeProps {
  onNavigate: (page: string) => void
  onOpenKiosk: () => void
}

const attendanceData = [
  { week: 'Wk 1', adults: 980, youth: 340 },
  { week: 'Wk 2', adults: 1050, youth: 380 },
  { week: 'Wk 3', adults: 920, youth: 310 },
  { week: 'Wk 4', adults: 1120, youth: 420 },
  { week: 'Wk 5', adults: 1080, youth: 390 },
  { week: 'Wk 6', adults: 1247, youth: 445 },
]

const upcomingEvents = [
  { title: 'Sunday Service', date: 'Jul 28', time: '9:00 AM', expected: 1200 },
  { title: 'Youth Conference', date: 'Aug 2', time: '10:00 AM', expected: 450 },
  { title: 'Prayer & Fasting', date: 'Aug 5', time: '6:00 AM', expected: 680 },
  { title: 'Thanksgiving Service', date: 'Aug 10', time: '9:30 AM', expected: 1500 },
]

const quickActions = [
  { label: 'Register member', icon: Plus, page: 'members' },
  { label: 'Record offering', icon: DollarSign, page: 'finance' },
  { label: 'Member check-in', icon: Fingerprint, page: 'kiosk' },
  { label: 'Generate report', icon: FileText, page: 'reports' },
]

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardHome({ onNavigate, onOpenKiosk }: DashboardHomeProps) {
  const { todayCount } = useCheckIn()
  const { members } = useMembers()
  const { summary, loading: financeLoading } = useFinance()

  const monthly = summary?.monthly ?? []
  const currentMonth = monthly[monthly.length - 1]
  const prevMonth = monthly.length > 1 ? monthly[monthly.length - 2] : null

  const incomeChange = useMemo(() => {
    if (!currentMonth || !prevMonth || prevMonth.income <= 0) return 'From live ledger'
    const pct = ((currentMonth.income - prevMonth.income) / prevMonth.income) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(0)}% vs last month`
  }, [currentMonth, prevMonth])

  const expenseChange = useMemo(() => {
    if (!currentMonth || !prevMonth || prevMonth.expenses <= 0) return 'From live ledger'
    const pct = ((currentMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(0)}% vs last month`
  }, [currentMonth, prevMonth])

  const recentActivity = useMemo(() => {
    const financeRecent = (summary?.recent || []).slice(0, 5).map((e) => {
      const name = e.memberName || e.description || e.category
      const action =
        e.kind === 'INCOME'
          ? `${e.category} recorded — ${formatMoney(e.amount)}`
          : `Expense — ${e.description || e.category} (${formatMoney(e.amount)})`
      return {
        name,
        action,
        time: relativeTime(e.occurredAt),
        avatar: localAvatar(name, 60),
      }
    })
    if (financeRecent.length > 0) return financeRecent
    return members.slice(0, 5).map((m) => ({
      name: m.name,
      action: m.fingerprintEnrolled ? 'Fingerprint enrolled' : 'Member on record',
      time: m.joined || '—',
      avatar: m.avatar || localAvatar(m.name, 60),
    }))
  }, [summary, members])

  const memberTotal = members.length
  const incomeValue = financeLoading ? '…' : formatMoney(currentMonth?.income ?? summary?.incomeTotal ?? 0)
  const expenseValue = financeLoading ? '…' : formatMoney(currentMonth?.expenses ?? summary?.expenseTotal ?? 0)

  const statCards = [
    {
      label: 'Total members',
      value: memberTotal.toLocaleString(),
      change: 'Live from members',
      icon: Users,
    },
    {
      label: "Today's attendance",
      value: todayCount.toLocaleString(),
      change: 'Live from check-in',
      icon: Fingerprint,
    },
    {
      label: 'This month income',
      value: incomeValue,
      change: incomeChange,
      icon: DollarSign,
    },
    {
      label: 'This month expenses',
      value: expenseValue,
      change: expenseChange,
      icon: TrendingDown,
    },
    {
      label: 'Net balance',
      value: financeLoading ? '…' : formatMoney(summary?.balance ?? 0),
      change: `${summary?.recordCount ?? 0} finance records`,
      icon: Building2,
    },
    {
      label: 'Upcoming events',
      value: String(upcomingEvents.length),
      change: 'From events calendar',
      icon: Calendar,
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="relative overflow-hidden rounded-lg px-5 py-5 sm:px-6 sm:py-6 bg-primary text-white">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 10% 0%, rgba(154,123,79,0.35), transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(42,61,104,0.9), transparent 45%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-accent-soft text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">
              Overview
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">
              Welcome back
            </h2>
            <p className="text-white/65 text-sm mt-1.5 max-w-md">
              Live members, giving, and check-in — ready for Sunday.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenKiosk}
            className="btn-accent shrink-0 px-5 py-2.5 text-sm font-medium rounded-md inline-flex items-center gap-2"
          >
            <Fingerprint size={15} />
            Open check-in
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="panel panel-hover rounded-lg p-4">
            <s.icon size={16} className="text-accent mb-3" strokeWidth={1.5} />
            <p className="font-display text-2xl font-semibold text-ink tracking-tight">{s.value}</p>
            <p className="text-xs text-[#5C6578] mt-0.5">{s.label}</p>
            <p className="text-[11px] text-[#A8AEB8] mt-1">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="panel rounded-lg p-4">
        <p className="text-sm font-medium text-ink mb-3">Quick actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => (a.page === 'kiosk' ? onOpenKiosk() : onNavigate(a.page))}
              className="flex items-center gap-2.5 px-3 py-3 rounded-md border border-[#E4E0DA] hover:border-[#D4CFC7] hover:bg-[#F8F6F3] transition-colors text-left"
            >
              <a.icon size={16} className="text-primary shrink-0" strokeWidth={1.5} />
              <span className="text-xs font-medium text-[#3D4555]">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-medium text-ink text-sm">Attendance trend</h3>
              <p className="text-[#A8AEB8] text-xs mt-0.5">Last 6 weeks</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              View <ChevronRight size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="adultGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1F2D4D" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1F2D4D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }} />
              <Area type="monotone" dataKey="adults" stroke="#1F2D4D" strokeWidth={1.75} fill="url(#adultGrad)" name="Adults" />
              <Area type="monotone" dataKey="youth" stroke="#9A7B4F" strokeWidth={1.75} fill="transparent" name="Youth" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-medium text-ink text-sm">Income vs expenses</h3>
              <p className="text-[#A8AEB8] text-xs mt-0.5">Last 6 months · live ledger</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              View <ChevronRight size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }}
                formatter={(v) => [formatMoney(Number(v || 0)), '']}
              />
              <Bar dataKey="income" fill="#1F2D4D" radius={[3, 3, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#9A7B4F" radius={[3, 3, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="panel rounded-lg p-5">
          <h3 className="font-medium text-ink text-sm mb-4">Membership</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={[{ month: 'Now', total: memberTotal }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke="#2F6B4F" strokeWidth={2} dot={{ fill: '#2F6B4F', r: 2.5 }} name="Members" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[#8A91A0]">Total on record</span>
            <span className="text-sm font-medium text-ink">{memberTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="panel rounded-lg p-5">
          <h3 className="font-medium text-ink text-sm mb-4">Recent finance activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#8A91A0]">No finance activity yet</p>
            ) : (
              recentActivity.map((a, i) => (
                <div key={`${a.name}-${i}`} className="flex items-center gap-3">
                  <img src={a.avatar || localAvatar(a.name, 60)} alt={a.name} className="w-7 h-7 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{a.name}</p>
                    <p className="text-[11px] text-[#8A91A0] truncate">{a.action}</p>
                  </div>
                  <span className="text-[10px] text-[#A8AEB8] whitespace-nowrap">{a.time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-ink text-sm">Upcoming events</h3>
            <button type="button" onClick={() => onNavigate('events')} className="text-xs text-primary font-medium hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((e) => (
              <div key={e.title} className="flex items-center gap-3 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink">{e.title}</p>
                  <p className="text-[11px] text-[#8A91A0]">{e.date} · {e.time}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-[#3D4555]">{e.expected.toLocaleString()}</p>
                  <p className="text-[10px] text-[#A8AEB8]">expected</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

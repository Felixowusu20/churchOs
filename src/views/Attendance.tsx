import {
  Fingerprint, Users, Clock, UserPlus, UserX, Filter, Download, Search, ExternalLink
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCheckIn } from '../context/CheckInContext'

const weeklyData = [
  { day: 'Mon', count: 45 },
  { day: 'Tue', count: 62 },
  { day: 'Wed', count: 310 },
  { day: 'Thu', count: 58 },
  { day: 'Fri', count: 89 },
  { day: 'Sat', count: 245 },
]

interface AttendanceProps {
  onOpenKiosk: () => void
}

export default function Attendance({ onOpenKiosk }: AttendanceProps) {
  const { checkIns, todayCount, lateCount, absentCount, totalMembers } = useCheckIn()
  const attendanceRate = ((todayCount / totalMembers) * 100).toFixed(1)

  const weeklyWithToday = [...weeklyData, { day: 'Sun', count: todayCount }]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="panel rounded-lg p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-[#F3F1EE] border border-[#E4E0DA] flex items-center justify-center shrink-0">
              <Fingerprint size={18} className="text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-medium text-ink text-sm">Open member check-in</h2>
              <p className="text-xs text-[#5C6578] mt-1 max-w-md leading-relaxed">
                Opens the fingerprint screen for today’s biometric events. Prefer opening from an event card to lock check-in to that gathering.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenKiosk}
            className="btn-primary shrink-0 px-5 py-2.5 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            Open check-in screen
            <ExternalLink size={14} />
          </button>
        </div>
        <div className="rounded-md bg-[#F8F6F3] border border-[#E4E0DA] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-medium text-[#8A91A0] uppercase tracking-wide shrink-0">Tip</span>
          <span className="text-xs text-[#5C6578]">
            Events → Open check-in locks the scanner to one event and updates that event’s count live.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's attendance", value: todayCount.toLocaleString(), icon: Users, sub: `of ${totalMembers.toLocaleString()} members` },
          { label: 'Late arrivals', value: lateCount.toLocaleString(), icon: Clock, sub: 'after 10:00 AM' },
          { label: 'First-time visitors', value: '17', icon: UserPlus, sub: 'this service' },
          { label: 'Not yet checked in', value: absentCount.toLocaleString(), icon: UserX, sub: 'remaining' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-lg p-4">
            <s.icon size={16} className="text-accent mb-3" strokeWidth={1.5} />
            <p className="font-display text-2xl font-semibold text-ink">{s.value}</p>
            <p className="text-xs text-[#5C6578] mt-0.5">{s.label}</p>
            <p className="text-[11px] text-[#A8AEB8] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 panel rounded-lg p-5">
          <div className="mb-5">
            <h3 className="font-medium text-ink text-sm">Weekly attendance</h3>
            <p className="text-[#A8AEB8] text-xs mt-0.5">Sunday count updates as members check in</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyWithToday} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#A8AEB8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0DA', fontSize: 12 }} />
              <Bar dataKey="count" fill="#1F2D4D" radius={[3, 3, 0, 0]} name="Attendance" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel rounded-lg p-5">
          <h3 className="font-medium text-ink text-sm mb-4">By department</h3>
          <div className="space-y-3.5">
            {[
              { dept: 'Adults', count: 680, total: 1400, pct: 49 },
              { dept: 'Youth', count: 320, total: 500, pct: 64 },
              { dept: 'Children', count: 195, total: 350, pct: 56 },
              { dept: 'Choir', count: 52, total: 60, pct: 87 },
            ].map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-[#3D4555]">{d.dept}</span>
                  <span className="text-[#8A91A0]">{d.count}/{d.total}</span>
                </div>
                <div className="h-1.5 bg-[#EDE9E4] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[#E4E0DA]">
            <p className="text-xs text-[#8A91A0]">Attendance rate</p>
            <p className="font-display text-2xl font-semibold text-ink">{attendanceRate}%</p>
          </div>
        </div>
      </div>

      <div className="panel rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#E4E0DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-medium text-ink text-sm">Check-in log</h3>
            <p className="text-[11px] text-[#A8AEB8] mt-0.5">Live from the member check-in screen</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-[#F3F1EE] border border-[#E4E0DA] rounded-md px-3 py-1.5">
              <Search size={12} className="text-[#A8AEB8]" />
              <input placeholder="Search…" className="bg-transparent text-xs outline-none text-ink placeholder-[#A8AEB8] w-28" />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5C6578] border border-[#E4E0DA] rounded-md hover:bg-[#F3F1EE]">
              <Filter size={12} /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5C6578] border border-[#E4E0DA] rounded-md hover:bg-[#F3F1EE]">
              <Download size={12} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E4E0DA] bg-[#F8F6F3]">
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5">Member</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5 hidden lg:table-cell">Event</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5 hidden sm:table-cell">ID</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5 hidden md:table-cell">Department</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5">Time</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map(r => (
                <tr key={r.id} className="table-row-hover border-b border-[#F0ECE7] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={r.avatar} alt={r.name} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-[#5C6578]">{r.eventTitle}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-[#8A91A0]">{r.memberId}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-[#5C6578]">{r.dept}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#5C6578]">{r.time}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${r.status === 'Present' ? 'text-success' : 'text-accent'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

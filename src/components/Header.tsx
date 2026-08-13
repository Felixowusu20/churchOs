import { Menu, Bell, Search } from 'lucide-react'
import { useState } from 'react'
import { useOrg } from '../context/OrgContext'

interface HeaderProps {
  title: string
  subtitle?: string
  onMobileToggle: () => void
  darkMode: boolean
  onDarkToggle: () => void
}

export default function Header({ title, subtitle, onMobileToggle }: HeaderProps) {
  const [search, setSearch] = useState('')
  const { admin } = useOrg()

  return (
    <header className="sticky top-0 z-30 bg-[#F7F5F2]/90 backdrop-blur-md border-b border-[#E4E0DA]/90 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMobileToggle}
          className="lg:hidden p-2 text-[#5C6578] hover:text-ink hover:bg-white rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-[1.35rem] font-semibold text-ink leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#8A91A0] text-xs mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 bg-white/90 border border-[#E4E0DA] rounded-md px-3 py-2 w-56 focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_rgba(31,45,77,0.06)] transition-all">
          <Search size={14} className="text-[#A8AEB8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="bg-transparent text-sm text-ink placeholder-[#A8AEB8] outline-none w-full"
          />
        </div>
        <button
          type="button"
          className="relative p-2 text-[#5C6578] hover:text-ink hover:bg-white rounded-md transition-colors"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={admin.avatar}
          alt={admin.fullName}
          className="w-8 h-8 rounded-full object-cover ring-1 ring-[#E4E0DA]"
          title={admin.fullName}
        />
      </div>
    </header>
  )
}

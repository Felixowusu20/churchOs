'use client'

import {
  LayoutDashboard, Users, DollarSign, Calendar,
  Users2, BarChart3, Settings, LogOut, ChevronDown, X
} from 'lucide-react'
import { useOrg } from '../context/OrgContext'
import { useAuth } from '../context/AuthContext'
import { canAccessPage, getRoleDefinition, type AppPage } from '../lib/roles'
import { localAvatar } from '../lib/avatars'
import { useHomepage } from '../hooks/useHomepage'
import SiteBrand from './SiteBrand'

const allNavItems: { id: AppPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'departments', label: 'Departments', icon: Users2 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
  mobileOpen: boolean
  onMobileToggle: () => void
}

export default function Sidebar({ active, onNavigate, mobileOpen, onMobileToggle }: SidebarProps) {
  const { church } = useOrg()
  const { admin, logout } = useAuth()
  const role = admin?.role || 'Super Admin'
  const navItems = allNavItems.filter((item) => canAccessPage(role, item.id))
  const avatar = admin?.avatarUrl || localAvatar(admin?.fullName || 'Admin', 64)
  const roleMeta = getRoleDefinition(role)
  const { content } = useHomepage()

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-ink/45 backdrop-blur-[2px] z-40 lg:hidden" onClick={onMobileToggle} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 z-50 flex flex-col
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background:
            'linear-gradient(180deg, #1A2744 0%, #1F2D4D 42%, #18243C 100%)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(154,123,79,0.18), transparent 45%)',
          }}
        />

        <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <SiteBrand content={content} variant="on-dark" size="mark" />
          <button type="button" onClick={onMobileToggle} className="lg:hidden text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="relative px-3 py-3 border-b border-white/[0.08]">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-white/[0.06] transition-colors"
          >
            <div className="text-left min-w-0">
              <p className="text-white text-sm font-medium truncate">{church.name}</p>
              <p className="text-white/40 text-xs truncate">{church.city || 'Main campus'}</p>
            </div>
            <ChevronDown size={14} className="text-white/35 shrink-0" />
          </button>
        </div>

        <nav className="relative flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase text-white/30">
            Menu
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = active === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id)
                    if (mobileOpen) onMobileToggle()
                  }}
                  className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                    isActive ? 'active text-white font-medium' : 'text-white/55 hover:text-white'
                  }`}
                >
                  <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="relative px-4 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt={admin?.fullName || 'Admin'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/15"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{admin?.fullName || 'Admin'}</p>
              <p className="text-white/40 text-xs truncate">{roleMeta.label}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                onNavigate('login')
              }}
              className="text-white/35 hover:text-white transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

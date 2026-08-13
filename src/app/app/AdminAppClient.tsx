'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import OfflineBanner from '@/components/OfflineBanner'
import DashboardHome from '@/views/DashboardHome'
import Members from '@/views/Members'
import Attendance from '@/views/Attendance'
import Finance from '@/views/Finance'
import Events from '@/views/Events'
import Departments from '@/views/Departments'
import Reports from '@/views/Reports'
import Settings from '@/views/Settings'
import {
  canAccessPage,
  defaultHomePage,
  getRoleDefinition,
  type AppPage,
} from '@/lib/roles'

type AdminPage = AppPage

const pageTitles: Record<AdminPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Welcome back' },
  members: { title: 'Members', subtitle: 'Register and manage congregation' },
  attendance: { title: 'Attendance', subtitle: 'Live counts and member check-in' },
  finance: { title: 'Finance', subtitle: 'Income, expenses, and giving' },
  events: { title: 'Events', subtitle: 'Gatherings with optional fingerprint check-in' },
  departments: { title: 'Departments', subtitle: 'Ministry teams' },
  reports: { title: 'Reports', subtitle: 'Attendance and financial summaries' },
  settings: { title: 'Settings', subtitle: 'Church details and staff access' },
}

export default function AdminAppClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { admin, loading, logout } = useAuth()
  const role = admin?.role
  const home = defaultHomePage(role)
  const pageParam = (searchParams?.get('page') ?? null) as AdminPage | null

  const initialPage = useMemo(() => {
    if (pageParam && pageParam in pageTitles && canAccessPage(role, pageParam)) return pageParam
    return home
  }, [pageParam, role, home])

  const [page, setPage] = useState<AdminPage>(initialPage)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (!admin) return
    if (pageParam && pageParam in pageTitles) {
      if (canAccessPage(admin.role, pageParam)) setPage(pageParam)
      else {
        setPage(home)
        router.replace(`/app?page=${home}`)
      }
      return
    }
    setPage(home)
  }, [pageParam, admin, home, router])

  useEffect(() => {
    if (!loading && !admin) router.replace('/login')
  }, [loading, admin, router])

  const navigatePage = (target: string) => {
    if (target === 'landing') {
      router.push('/')
      return
    }
    if (target === 'login') {
      logout()
      router.push('/login')
      return
    }
    if (target === 'kiosk' || target === 'check-in') {
      router.push('/app/check-in')
      return
    }
    const next = target as AdminPage
    if (!canAccessPage(role, next)) return
    setPage(next)
    router.replace(`/app?page=${next}`)
  }

  const openKiosk = () => router.push('/app/check-in')
  const titles = pageTitles[page]
  const roleLabel = getRoleDefinition(role).label
  const subtitle = admin ? `${roleLabel} · ${admin.fullName}` : titles.subtitle

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-[#8A91A0]">Loading your church portal…</p>
      </div>
    )
  }

  return (
    <div className={`h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F7F5F2] flex flex-col ${darkMode ? 'dark' : ''}`}>
      <OfflineBanner />
      <div className="relative flex-1 min-h-0">
      <Sidebar
        active={page}
        onNavigate={navigatePage}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
      />
      <div className="lg:pl-60 h-full min-h-0 flex flex-col overflow-hidden">
        <Header
          title={titles.title}
          subtitle={subtitle}
          onMobileToggle={() => setMobileOpen(!mobileOpen)}
          darkMode={darkMode}
          onDarkToggle={() => setDarkMode(!darkMode)}
        />
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-[max(1rem,env(safe-area-inset-bottom))]">
          {page === 'dashboard' && canAccessPage(role, 'dashboard') && (
            <DashboardHome onNavigate={navigatePage} onOpenKiosk={openKiosk} />
          )}
          {page === 'members' && canAccessPage(role, 'members') && <Members />}
          {page === 'attendance' && canAccessPage(role, 'attendance') && <Attendance onOpenKiosk={openKiosk} />}
          {page === 'finance' && canAccessPage(role, 'finance') && <Finance />}
          {page === 'events' && canAccessPage(role, 'events') && <Events />}
          {page === 'departments' && canAccessPage(role, 'departments') && <Departments />}
          {page === 'reports' && canAccessPage(role, 'reports') && <Reports />}
          {page === 'settings' && canAccessPage(role, 'settings') && <Settings />}
        </main>
      </div>
      </div>
    </div>
  )
}

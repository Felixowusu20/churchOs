'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Landing from '@/views/Landing'
import { useAuth } from '@/context/AuthContext'

function HomeInner() {
  const router = useRouter()
  const { admin, loading } = useAuth()

  /** Navbar Member check-in: must sign in before fingerprint screen. */
  const goCheckIn = () => {
    if (loading) return
    if (admin) {
      router.push('/app/check-in')
      return
    }
    router.push(`/login?next=${encodeURIComponent('/app/check-in')}`)
  }

  return (
    <Landing
      isSignedIn={Boolean(admin)}
      onNavigate={(page) => {
        if (page === 'login') router.push('/login')
        else if (page === 'check-in' || page === 'kiosk') goCheckIn()
        else router.push('/')
      }}
    />
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  )
}

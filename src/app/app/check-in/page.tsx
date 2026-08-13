'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Kiosk from '@/views/Kiosk'
import { useAuth } from '@/context/AuthContext'

function CheckInGate() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { admin, loading } = useAuth()
  const event = searchParams?.get('event') ?? null

  useEffect(() => {
    if (loading) return
    if (!admin) {
      const next = event
        ? `/app/check-in?event=${encodeURIComponent(event)}`
        : '/app/check-in'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [admin, loading, router, event])

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-[#8A91A0]">Sign in required for check-in…</p>
      </div>
    )
  }

  return <Kiosk />
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center text-sm text-[#8A91A0]">
          Loading check-in…
        </div>
      }
    >
      <CheckInGate />
    </Suspense>
  )
}

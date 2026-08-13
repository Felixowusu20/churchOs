'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Login from '@/views/Login'

function safeNext(raw: string | null) {
  if (!raw) return null
  // Only allow internal paths
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams?.get('next') ?? null)

  const goAfterAuth = () => {
    router.push(next || '/app')
  }

  return (
    <Login
      nextPath={next}
      onNavigate={(page) => {
        if (page === 'dashboard' || page === 'check-in') goAfterAuth()
        else if (page === 'landing') router.push('/')
        else router.push('/login')
      }}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center text-sm text-[#8A91A0]">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}

import { Suspense } from 'react'
import AdminAppClient from './AdminAppClient'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F1EE] flex items-center justify-center text-sm text-[#8A91A0]">
          Loading…
        </div>
      }
    >
      <AdminAppClient />
    </Suspense>
  )
}

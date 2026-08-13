'use client'

import { AuthProvider } from '@/context/AuthContext'
import { OrgProvider } from '@/context/OrgContext'
import { MembersProvider } from '@/context/MembersContext'
import { FinanceProvider } from '@/context/FinanceContext'
import { DepartmentsProvider } from '@/context/DepartmentsContext'
import { CheckInProvider } from '@/context/CheckInContext'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <MembersProvider>
          <DepartmentsProvider>
            <FinanceProvider>
              <CheckInProvider>{children}</CheckInProvider>
            </FinanceProvider>
          </DepartmentsProvider>
        </MembersProvider>
      </OrgProvider>
    </AuthProvider>
  )
}

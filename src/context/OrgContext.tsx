import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { localAvatar } from '../lib/avatars'
import { loadStore, saveStore, STORE_KEYS } from '../lib/offlineStore'

export type ChurchProfile = {
  name: string
  founded: string
  seniorPastor: string
  denomination: string
  email: string
  phone: string
  city: string
  country: string
  address: string
  website: string
}

export type AdminProfile = {
  fullName: string
  title: string
  email: string
  phone: string
  role: string
  avatar: string
}

type OrgState = {
  church: ChurchProfile
  admin: AdminProfile
  password: string
}

type OrgContextValue = {
  church: ChurchProfile
  admin: AdminProfile
  updateChurch: (patch: Partial<ChurchProfile>) => void
  updateAdmin: (patch: Partial<AdminProfile>) => void
  changePassword: (current: string, next: string) => { ok: boolean; message: string }
}

const defaultChurch: ChurchProfile = {
  name: 'Grace Chapel',
  founded: '1998',
  seniorPastor: 'Rev. John Mensah',
  denomination: 'Pentecostal',
  email: 'admin@gracechapel.org',
  phone: '+233 30 277 8899',
  city: 'Accra',
  country: 'Ghana',
  address: '123 Liberation Road, Accra, Ghana',
  website: 'www.gracechapel.org',
}

const defaultAdmin: AdminProfile = {
  fullName: 'Rev. J. Mensah',
  title: 'Senior Pastor',
  email: 'admin@churchos.com',
  phone: '+233 24 111 2233',
  role: 'Super Admin',
  avatar: localAvatar('Rev. J. Mensah'),
}

const defaults: OrgState = {
  church: defaultChurch,
  admin: defaultAdmin,
  password: 'demo1234',
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrgState>(() => loadStore(STORE_KEYS.org, defaults))

  useEffect(() => {
    saveStore(STORE_KEYS.org, state)
  }, [state])

  const updateChurch = useCallback((patch: Partial<ChurchProfile>) => {
    setState(prev => ({ ...prev, church: { ...prev.church, ...patch } }))
  }, [])

  const updateAdmin = useCallback((patch: Partial<AdminProfile>) => {
    setState(prev => ({ ...prev, admin: { ...prev.admin, ...patch } }))
  }, [])

  const changePassword = useCallback((current: string, next: string) => {
    if (!current || !next) {
      return { ok: false, message: 'Fill in both current and new password' }
    }
    if (current !== state.password) {
      return { ok: false, message: 'Current password is incorrect' }
    }
    if (next.length < 6) {
      return { ok: false, message: 'New password must be at least 6 characters' }
    }
    if (next === current) {
      return { ok: false, message: 'New password must be different from the current one' }
    }
    setState(prev => ({ ...prev, password: next }))
    return { ok: true, message: 'Password updated successfully' }
  }, [state.password])

  const value = useMemo(
    () => ({
      church: state.church,
      admin: state.admin,
      updateChurch,
      updateAdmin,
      changePassword,
    }),
    [state.church, state.admin, updateChurch, updateAdmin, changePassword],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}

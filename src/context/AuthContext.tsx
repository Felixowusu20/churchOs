import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from '../lib/api'

export type AdminUser = {
  id: string
  email: string
  fullName: string
  title: string
  phone: string
  role: string
  avatarUrl: string | null
  createdAt: string
}

type AuthContextValue = {
  admin: AdminUser | null
  token: string | null
  loading: boolean
  canRegister: boolean
  setupMessage: string
  refreshSetup: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    fullName: string
    title?: string
    phone?: string
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [loading, setLoading] = useState(true)
  const [canRegister, setCanRegister] = useState(false)
  const [setupMessage, setSetupMessage] = useState('')

  const refreshSetup = useCallback(async () => {
    try {
      const status = await api<{ hasAdmin: boolean; canRegister: boolean; message: string }>(
        '/api/auth/setup-status',
      )
      setCanRegister(status.canRegister)
      setSetupMessage(status.message)
    } catch {
      setCanRegister(false)
      setSetupMessage('API unavailable')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await refreshSetup()
      const existing = getToken()
      if (!existing) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const me = await api<{ admin: AdminUser }>('/api/auth/me')
        if (!cancelled) {
          setAdmin(me.admin)
          setTokenState(existing)
        }
      } catch {
        setToken(null)
        if (!cancelled) {
          setAdmin(null)
          setTokenState(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshSetup])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; admin: AdminUser }>('/api/auth/login', {
      method: 'POST',
      json: { email, password },
    })
    setToken(res.token)
    setTokenState(res.token)
    setAdmin(res.admin)
    await refreshSetup()
  }, [refreshSetup])

  const register = useCallback(async (input: {
    email: string
    password: string
    fullName: string
    title?: string
    phone?: string
  }) => {
    const res = await api<{ token: string; admin: AdminUser }>('/api/auth/register', {
      method: 'POST',
      json: input,
    })
    setToken(res.token)
    setTokenState(res.token)
    setAdmin(res.admin)
    await refreshSetup()
  }, [refreshSetup])

  const logout = useCallback(() => {
    setToken(null)
    setTokenState(null)
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({
      admin,
      token,
      loading,
      canRegister,
      setupMessage,
      refreshSetup,
      login,
      register,
      logout,
    }),
    [admin, token, loading, canRegister, setupMessage, refreshSetup, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from './AuthContext'
import type { DepartmentRecord } from '../lib/departments'

export type DepartmentInput = {
  name: string
  description?: string
  leaderName?: string
  meetingDay?: string
  meetingTime?: string
  color?: string
  bg?: string
  status?: 'Active' | 'Inactive'
}

type DepartmentsContextValue = {
  departments: DepartmentRecord[]
  names: string[]
  loading: boolean
  error: string
  refresh: () => Promise<void>
  createDepartment: (input: DepartmentInput) => Promise<DepartmentRecord>
  updateDepartment: (id: string, input: Partial<DepartmentInput>) => Promise<DepartmentRecord>
  deleteDepartment: (id: string) => Promise<{ reassignedMembers: number; unlinkedEvents: number }>
}

const DepartmentsContext = createContext<DepartmentsContextValue | null>(null)

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const { token, admin } = useAuth()
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api<{ departments: DepartmentRecord[] }>('/api/departments')
      setDepartments(data.departments)
    } catch (err) {
      // Public GET may still work without auth; fall through message
      setError(err instanceof ApiError ? err.message : 'Failed to load departments')
      if (!token) setDepartments([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refresh()
  }, [refresh, admin?.id])

  const createDepartment = useCallback(async (input: DepartmentInput) => {
    const res = await api<{ department: DepartmentRecord }>('/api/departments', {
      method: 'POST',
      json: input,
    })
    await refresh()
    return res.department
  }, [refresh])

  const updateDepartment = useCallback(async (id: string, input: Partial<DepartmentInput>) => {
    const res = await api<{ department: DepartmentRecord }>(`/api/departments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: input,
    })
    await refresh()
    return res.department
  }, [refresh])

  const deleteDepartment = useCallback(async (id: string) => {
    const res = await api<{ reassignedMembers: number; unlinkedEvents: number }>(
      `/api/departments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
    await refresh()
    return { reassignedMembers: res.reassignedMembers, unlinkedEvents: res.unlinkedEvents }
  }, [refresh])

  const names = useMemo(
    () => departments.filter((d) => d.status === 'Active').map((d) => d.name),
    [departments],
  )

  const value = useMemo(
    () => ({
      departments,
      names,
      loading,
      error,
      refresh,
      createDepartment,
      updateDepartment,
      deleteDepartment,
    }),
    [departments, names, loading, error, refresh, createDepartment, updateDepartment, deleteDepartment],
  )

  return <DepartmentsContext.Provider value={value}>{children}</DepartmentsContext.Provider>
}

export function useDepartments() {
  const ctx = useContext(DepartmentsContext)
  if (!ctx) throw new Error('useDepartments must be used within DepartmentsProvider')
  return ctx
}

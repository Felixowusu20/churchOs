import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react'
import { api } from '../lib/api'
import { formatMemberDate, memberDepartments, memberGenders, teachingClasses, maritalStatuses } from '../lib/members'

export type Member = {
  id: string
  dbId?: string
  name: string
  gender: string
  dob: string
  phone: string
  address: string
  teachingClass: string
  dept: string
  baptized: boolean
  dateJoined: string
  occupation: string
  maritalStatus: string
  emergencyContact: string
  status: 'Active' | 'Inactive'
  avatar: string
  fingerprintEnrolled: boolean
  fingerprintCredentialId?: string | null
  joined: string
  email: string
}

export type RegisterInput = {
  id?: string
  name: string
  gender: string
  dob: string
  phone: string
  address: string
  teachingClass: string
  dept: string
  baptized: boolean
  dateJoined: string
  occupation: string
  maritalStatus: string
  emergencyContact: string
  email?: string
  avatar?: string
  fingerprintEnrolled?: boolean
  fingerprintCredentialId?: string
}

type MembersContextValue = {
  members: Member[]
  loading: boolean
  error: string
  nextId: string
  refresh: () => Promise<void>
  peekNextId: () => string
  addMember: (input: RegisterInput) => Promise<Member>
  updateMember: (id: string, input: RegisterInput) => Promise<Member>
  removeMember: (id: string) => Promise<void>
  getMember: (id: string) => Member | undefined
}

const MembersContext = createContext<MembersContextValue | null>(null)

export { formatMemberDate, memberDepartments, memberGenders, teachingClasses, maritalStatuses }

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([])
  const [nextId, setNextId] = useState('GC-001001')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api<{ members: Member[]; nextId: string }>('/api/members')
      setMembers(data.members)
      setNextId(data.nextId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const peekNextId = useCallback(() => nextId, [nextId])

  const addMember = useCallback(async (input: RegisterInput) => {
    const res = await api<{ member: Member }>('/api/members', {
      method: 'POST',
      json: input,
    })
    setMembers((prev) => [res.member, ...prev])
    await refresh()
    return res.member
  }, [refresh])

  const updateMember = useCallback(async (id: string, input: RegisterInput) => {
    const res = await api<{ member: Member }>(`/api/members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: input,
    })
    setMembers((prev) =>
      prev.map((m) => (m.id === id || m.dbId === res.member.dbId ? res.member : m)),
    )
    return res.member
  }, [])

  const removeMember = useCallback(async (id: string) => {
    await api(`/api/members/${encodeURIComponent(id)}`, { method: 'DELETE' })
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const getMember = useCallback((id: string) => members.find((m) => m.id === id), [members])

  const value = useMemo(
    () => ({
      members,
      loading,
      error,
      nextId,
      refresh,
      peekNextId,
      addMember,
      updateMember,
      removeMember,
      getMember,
    }),
    [members, loading, error, nextId, refresh, peekNextId, addMember, updateMember, removeMember, getMember],
  )

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>
}

export function useMembers() {
  const ctx = useContext(MembersContext)
  if (!ctx) throw new Error('useMembers must be used within MembersProvider')
  return ctx
}

export const baptizedOptions = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
]

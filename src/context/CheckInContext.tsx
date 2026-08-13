import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { localAvatar, localCover } from '../lib/avatars'
import { api, ApiError } from '../lib/api'
import { useAuth } from './AuthContext'
import { useMembers } from './MembersContext'

export type ChurchEvent = {
  id: string
  dbId?: string
  title: string
  type: string
  date: string
  time: string
  venue: string
  capacity: number
  registered: number
  color: string
  bg: string
  status: 'Upcoming' | 'Completed' | 'Live'
  biometric: boolean
  img: string
  departmentId?: string | null
}

export type CheckInRecord = {
  id: string
  memberId: string
  name: string
  dept: string
  avatar: string
  time: string
  status: 'Present' | 'Late'
  eventId: string
  eventTitle: string
  at: number
}

type ApiEvent = {
  id: string
  code: string
  title: string
  type: string
  dateLabel: string
  timeLabel: string
  venue: string
  capacity: number
  registered: number
  color: string
  bg: string
  status: string
  biometric: boolean
  imageUrl: string | null
  departmentId?: string | null
}

const TOTAL_MEMBERS = 2447

export type EventInput = {
  title: string
  type: string
  date: string
  time: string
  venue: string
  capacity: number
  registered?: number
  color: string
  bg: string
  status: ChurchEvent['status']
  biometric: boolean
  img?: string
  departmentId?: string | null
}

type ApiCheckIn = {
  id: string
  memberId: string
  name: string
  dept: string
  avatar?: string
  status: 'Present' | 'Late'
  eventId: string
  eventTitle: string
  at: number
  time: string
}

type CheckInContextValue = {
  events: ChurchEvent[]
  checkInEvents: ChurchEvent[]
  checkIns: CheckInRecord[]
  todayCount: number
  lateCount: number
  absentCount: number
  totalMembers: number
  loading: boolean
  error: string
  refreshEvents: () => Promise<void>
  getEvent: (id: string) => ChurchEvent | undefined
  getEventCheckInCount: (eventId: string) => number
  getCheckInsForEvent: (eventId: string) => CheckInRecord[]
  recordSuccessfulScan: (
    eventId: string,
    memberCode?: string,
  ) => Promise<{ record: CheckInRecord; alreadyCheckedIn: boolean } | null>
  recordFailedScan: () => void
  addEvent: (input: EventInput) => Promise<ChurchEvent>
  updateEvent: (id: string, input: Partial<EventInput>) => Promise<ChurchEvent>
  deleteEvent: (id: string) => Promise<void>
}

const CheckInContext = createContext<CheckInContextValue | null>(null)

function mapApiEvent(e: ApiEvent): ChurchEvent {
  return {
    id: e.code,
    dbId: e.id,
    title: e.title,
    type: e.type,
    date: e.dateLabel,
    time: e.timeLabel,
    venue: e.venue,
    capacity: e.capacity,
    registered: e.registered,
    color: e.color,
    bg: e.bg,
    status: e.status as ChurchEvent['status'],
    biometric: e.biometric,
    img: e.imageUrl || localCover(e.title, e.color),
    departmentId: e.departmentId ?? null,
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function isLate(date: Date) {
  return date.getHours() > 10 || (date.getHours() === 10 && date.getMinutes() > 0)
}

function mapApiCheckIn(c: ApiCheckIn, members: { id: string; avatar: string }[]): CheckInRecord {
  const avatar = c.avatar || members.find((m) => m.id === c.memberId)?.avatar || localAvatar(c.name)
  return {
    id: c.id,
    memberId: c.memberId,
    name: c.name,
    dept: c.dept,
    avatar,
    time: c.time || formatTime(new Date(c.at)),
    status: c.status,
    eventId: c.eventId,
    eventTitle: c.eventTitle,
    at: c.at,
  }
}

export function CheckInProvider({ children }: { children: ReactNode }) {
  const { members } = useMembers()
  const { token } = useAuth()
  const [events, setEvents] = useState<ChurchEvent[]>([])
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const memberCursor = useRef(0)

  const refreshEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Events must load even if check-ins fail (auth timing / permission).
      const eventsRes = await api<{ events: ApiEvent[] }>('/api/events')
      setEvents((eventsRes.events || []).map(mapApiEvent))

      if (token) {
        try {
          const checkInsRes = await api<{ checkIns: ApiCheckIn[] }>('/api/events/check-ins')
          setCheckIns((checkInsRes.checkIns || []).map((c) => mapApiCheckIn(c, members)))
        } catch {
          setCheckIns([])
        }
      } else {
        setCheckIns([])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
    // members used only for avatar fallback at fetch time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    void refreshEvents()
  }, [refreshEvents])

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events])

  const getCheckInsForEvent = useCallback(
    (eventId: string) => checkIns.filter((c) => c.eventId === eventId),
    [checkIns],
  )

  const getEventCheckInCount = useCallback(
    (eventId: string) => {
      const uniqueMembers = new Set(
        checkIns.filter((c) => c.eventId === eventId).map((c) => c.memberId),
      )
      const fromLog = uniqueMembers.size
      const fromEvent = events.find((e) => e.id === eventId)?.registered ?? 0
      return Math.max(fromLog, fromEvent)
    },
    [checkIns, events],
  )

  const recordSuccessfulScan = useCallback(async (eventId: string, memberCode?: string) => {
    const event = events.find((e) => e.id === eventId)
    if (!event || !event.biometric) return null

    const enrolled = members.filter((m) => m.fingerprintEnrolled && m.status === 'Active')
    const pool = enrolled.length ? enrolled : members.filter((m) => m.status === 'Active')
    if (!pool.length) return null

    let member = memberCode ? pool.find((m) => m.id === memberCode) : undefined
    if (!member) {
      member = pool[memberCursor.current % pool.length]
      memberCursor.current += 1
    }
    const now = new Date()
    const status: 'Present' | 'Late' = isLate(now) ? 'Late' : 'Present'

    try {
      const res = await api<{
        checkIn: ApiCheckIn
        alreadyCheckedIn?: boolean
        registered?: number
      }>('/api/events/check-ins', {
        method: 'POST',
        json: {
          eventCode: event.id,
          memberCode: member.id,
          status,
        },
      })
      const record = mapApiCheckIn(
        { ...res.checkIn, avatar: res.checkIn.avatar || member.avatar },
        members,
      )
      setCheckIns((prev) => {
        const next = [
          record,
          ...prev.filter(
            (c) => c.id !== record.id && !(c.eventId === record.eventId && c.memberId === record.memberId),
          ),
        ]
        return next
      })
      if (typeof res.registered === 'number') {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, registered: res.registered as number } : e)),
        )
      } else if (!res.alreadyCheckedIn) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, registered: e.registered + 1 } : e)),
        )
      }
      return { record, alreadyCheckedIn: Boolean(res.alreadyCheckedIn) }
    } catch {
      return null
    }
  }, [events, members])

  const recordFailedScan = useCallback(() => {}, [])

  const addEvent = useCallback(async (input: EventInput) => {
    const res = await api<{ event: ApiEvent }>('/api/events', {
      method: 'POST',
      json: {
        title: input.title,
        type: input.type,
        dateLabel: input.date,
        timeLabel: input.time,
        venue: input.venue,
        capacity: input.capacity,
        registered: input.registered ?? 0,
        color: input.color,
        bg: input.bg,
        status: input.status,
        biometric: input.biometric,
        imageUrl: input.img?.startsWith('http') || input.img?.startsWith('data:') ? input.img : undefined,
        departmentId: input.departmentId ?? null,
      },
    })
    const mapped = mapApiEvent(res.event)
    setEvents((prev) => [mapped, ...prev.filter((e) => e.id !== mapped.id)])
    return mapped
  }, [])

  const updateEvent = useCallback(async (id: string, input: Partial<EventInput>) => {
    const res = await api<{ event: ApiEvent }>(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.date !== undefined ? { dateLabel: input.date } : {}),
        ...(input.time !== undefined ? { timeLabel: input.time } : {}),
        ...(input.venue !== undefined ? { venue: input.venue } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.registered !== undefined ? { registered: input.registered } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.bg !== undefined ? { bg: input.bg } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.biometric !== undefined ? { biometric: input.biometric } : {}),
        ...(input.img !== undefined
          ? { imageUrl: input.img?.startsWith('http') || input.img?.startsWith('data:') ? input.img : null }
          : {}),
        ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      },
    })
    const mapped = mapApiEvent(res.event)
    setEvents((prev) => prev.map((e) => (e.id === id || e.id === mapped.id ? mapped : e)))
    setCheckIns((prev) =>
      prev.map((c) => (c.eventId === id ? { ...c, eventId: mapped.id, eventTitle: mapped.title } : c)),
    )
    return mapped
  }, [])

  const deleteEvent = useCallback(async (id: string) => {
    await api(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setCheckIns((prev) => prev.filter((c) => c.eventId !== id))
  }, [])

  const checkInEvents = useMemo(
    () => events.filter((e) => e.biometric && e.status !== 'Completed'),
    [events],
  )

  const value = useMemo(() => {
    const todayCount = checkIns.length
    const lateCount = checkIns.filter((c) => c.status === 'Late').length
    return {
      events,
      checkInEvents,
      checkIns,
      todayCount,
      lateCount,
      absentCount: Math.max(TOTAL_MEMBERS - todayCount, 0),
      totalMembers: TOTAL_MEMBERS,
      loading,
      error,
      refreshEvents,
      getEvent,
      getEventCheckInCount,
      getCheckInsForEvent,
      recordSuccessfulScan,
      recordFailedScan,
      addEvent,
      updateEvent,
      deleteEvent,
    }
  }, [
    events,
    checkInEvents,
    checkIns,
    loading,
    error,
    refreshEvents,
    getEvent,
    getEventCheckInCount,
    getCheckInsForEvent,
    recordSuccessfulScan,
    recordFailedScan,
    addEvent,
    updateEvent,
    deleteEvent,
  ])

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext)
  if (!ctx) throw new Error('useCheckIn must be used within CheckInProvider')
  return ctx
}

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Fingerprint, Check, AlertCircle, RotateCcw, X,
  Church, Clock, Users, CalendarDays, MapPin,
  ShieldCheck, ArrowLeft
} from 'lucide-react'
import { useCheckIn } from '../context/CheckInContext'
import { useOrg } from '../context/OrgContext'
import OfflineBanner from '../components/OfflineBanner'
import FaceScanCapture from '../components/FaceScanCapture'
import { api } from '../lib/api'
import { assertFingerprint, isWebAuthnAvailable } from '../lib/webauthn'

type CheckInState = 'idle' | 'scanning' | 'success' | 'failed'
type ScreenMode = 'pick' | 'checkin'

interface SuccessData {
  name: string
  id: string
  dept: string
  avatar: string
  eventTitle: string
  alreadyCheckedIn?: boolean
}

export default function Kiosk() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    checkInEvents,
    getEventCheckInCount,
    recordSuccessfulScan,
  } = useCheckIn()
  const { church } = useOrg()

  const lockedFromUrl = searchParams?.get('event') ?? null
  const lockedEvent = useMemo(
    () => (lockedFromUrl ? checkInEvents.find(e => e.id === lockedFromUrl) : undefined),
    [lockedFromUrl, checkInEvents],
  )

  const [mode, setMode] = useState<ScreenMode>(() => {
    if (lockedEvent || checkInEvents.length <= 1) return 'checkin'
    return 'pick'
  })
  const [eventId, setEventId] = useState(() => lockedEvent?.id ?? checkInEvents[0]?.id ?? '')
  const [state, setState] = useState<CheckInState>('idle')
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [exitTaps, setExitTaps] = useState(0)
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    if (lockedEvent) {
      setEventId(lockedEvent.id)
      setMode('checkin')
    } else if (!eventId && checkInEvents[0]) {
      setEventId(checkInEvents[0].id)
    }
  }, [lockedEvent, checkInEvents, eventId])

  const selectedEvent = checkInEvents.find(e => e.id === eventId) ?? checkInEvents[0]
  const eventCount = selectedEvent ? getEventCheckInCount(selectedEvent.id) : 0
  const canChangeEvent = !lockedEvent && checkInEvents.length > 1

  const exitKiosk = () => {
    router.push(lockedEvent ? '/app?page=events' : '/app?page=attendance')
  }

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (exitTaps === 0) return
    const reset = setTimeout(() => setExitTaps(0), 2000)
    return () => clearTimeout(reset)
  }, [exitTaps])

  const handleBrandTap = () => {
    const next = exitTaps + 1
    setExitTaps(next)
    if (next >= 5) exitKiosk()
  }

  const chooseEvent = (id: string) => {
    setEventId(id)
    setMode('checkin')
    setState('idle')
    setSuccessData(null)
  }

  const beginScan = () => {
    if (!selectedEvent) return
    setScanError('')
    if (!isWebAuthnAvailable()) {
      setScanError('Open check-in in Safari on your iPhone to use Face ID / Touch ID.')
      setState('failed')
      return
    }
    setState('scanning')
  }

  const runCheckInAuth = async () => {
    if (!selectedEvent) throw new Error('No event selected')

    const creds = await api<{
      credentials: { memberCode: string; name: string; credentialId: string }[]
    }>('/api/members/fingerprint-credentials')

    if (!creds.credentials.length) {
      throw new Error('No phone biometrics enrolled yet. Register a member with Face ID first.')
    }

    const assertion = await assertFingerprint(creds.credentials.map((c) => c.credentialId))
    const matched = creds.credentials.find((c) => c.credentialId === assertion.credentialId)
    if (!matched) {
      throw new Error('Face not recognized for any enrolled member.')
    }

    const result = await recordSuccessfulScan(selectedEvent.id, matched.memberCode)
    if (!result) {
      throw new Error('Could not save check-in. Try again.')
    }
    setSuccessData({
      name: result.record.name,
      id: result.record.memberId,
      dept: result.record.dept,
      avatar: result.record.avatar,
      eventTitle: result.record.eventTitle,
      alreadyCheckedIn: result.alreadyCheckedIn,
    })
    return { alreadyCheckedIn: result.alreadyCheckedIn }
  }

  if (checkInEvents.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center px-6">
        <div className="panel rounded-lg p-10 max-w-md text-center">
          <Fingerprint size={32} className="text-accent mx-auto mb-4" strokeWidth={1.4} />
          <h1 className="font-display text-2xl font-semibold text-ink mb-2">No check-in events</h1>
          <p className="text-sm text-[#5C6578] mb-6">
            Create an upcoming event and turn on fingerprint check-in, then open this screen again.
          </p>
          <button type="button" onClick={exitKiosk} className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium">
            Back to admin
          </button>
        </div>
      </div>
    )
  }

  /* Step 1 — pick event (only when multiple and not locked from Events) */
  if (mode === 'pick') {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#F7F5F2] flex flex-col">
        <header className="px-4 sm:px-10 py-4 sm:py-5 border-b border-[#E4E0DA] bg-white flex items-center justify-between safe-pt">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Church size={16} className="text-accent-soft" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg sm:text-xl font-semibold text-ink truncate">{church.name}</p>
              <p className="text-xs text-[#8A91A0]">Choose the event for check-in</p>
            </div>
          </div>
          <button type="button" onClick={exitKiosk} className="text-xs text-[#8A91A0] hover:text-ink inline-flex items-center gap-1 shrink-0 p-2">
            <X size={14} /> Exit
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-6 sm:py-10 safe-pb">
          <div className="w-full max-w-2xl mx-auto">
            <h1 className="font-display text-2xl sm:text-4xl font-semibold text-ink text-center mb-2">
              Which event?
            </h1>
            <p className="text-center text-[#5C6578] text-sm mb-6 sm:mb-8 px-2">
              Select one gathering. Check-in will lock to that event.
            </p>
            <div className="space-y-3">
              {checkInEvents.map(event => {
                const count = getEventCheckInCount(event.id)
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => chooseEvent(event.id)}
                    className="w-full text-left panel rounded-xl p-4 sm:p-5 hover:border-accent/40 active:bg-[#F8F6F3] transition-colors flex items-center gap-3 sm:gap-4 touch-manipulation"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-[#EDE9E4]">
                      <img src={event.img} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink truncate">{event.title}</p>
                      <p className="text-xs text-[#8A91A0] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={11} />{event.date}</span>
                        <span className="inline-flex items-center gap-1"><MapPin size={11} />{event.venue}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-xl font-semibold text-ink tabular-nums">{count}</p>
                      <p className="text-[10px] text-[#A8AEB8]">checked in</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!selectedEvent) return null

  /* Step 2 — focused check-in for the selected event only */
  return (
    <div className="kiosk-screen flex flex-col h-[100dvh] max-h-[100dvh]">
      <OfflineBanner />

      {/* Mobile top bar */}
      <header className="lg:hidden shrink-0 safe-pt border-b border-[#E4E0DA] bg-white px-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={handleBrandTap} className="min-w-0 text-left">
            <p className="font-display text-lg font-semibold text-ink truncate">{church.name}</p>
            <p className="text-[11px] text-[#8A91A0] truncate">{selectedEvent.title}</p>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs tabular-nums text-[#5C6578] bg-[#F3F1EE] rounded-md px-2 py-1">
              {eventCount} in
            </span>
            <button
              type="button"
              onClick={exitKiosk}
              className="p-2 text-[#8A91A0] hover:text-ink rounded-md"
              aria-label="Exit"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col lg:flex-row lg:min-h-full">
          <aside className="relative lg:w-[38%] lg:min-h-[100dvh] bg-primary text-white lg:sticky lg:top-0 overflow-hidden">
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedEvent.img} alt="" className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/70" />
            </div>

            {/* Compact mobile event card */}
            <div className="relative z-10 lg:hidden px-4 py-4">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                <p className="text-accent-soft text-[10px] font-medium uppercase tracking-[0.14em] mb-1">
                  Checking in
                </p>
                <h1 className="font-display text-xl font-semibold leading-tight mb-2">{selectedEvent.title}</h1>
                <p className="text-xs text-white/65 truncate">
                  {selectedEvent.venue} · {selectedEvent.time}
                </p>
              </div>
            </div>

            <div className="relative z-10 hidden lg:flex flex-col justify-between h-full px-8 xl:px-10 py-12">
              <div>
                <button type="button" onClick={handleBrandTap} className="flex items-center gap-3 text-left mb-10">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <Church size={22} strokeWidth={1.5} className="text-accent-soft" />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold tracking-tight leading-none">{church.name}</p>
                    <p className="text-white/50 text-xs mt-1.5">Member check-in</p>
                  </div>
                </button>
                <p className="text-accent-soft text-xs font-medium uppercase tracking-[0.14em] mb-3">
                  Now checking in
                </p>
                <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.1] mb-6">
                  {selectedEvent.title}
                </h1>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 mb-8">
                  <span className="text-xs text-white/80">{selectedEvent.type}</span>
                  {selectedEvent.status === 'Live' && (
                    <>
                      <span className="w-px h-3 bg-white/20" />
                      <span className="flex items-center gap-1.5 text-xs text-accent-soft">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-soft" />
                        Live now
                      </span>
                    </>
                  )}
                </div>
                <div className="space-y-3.5 text-sm text-white/70">
                  <p className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <CalendarDays size={14} className="text-accent-soft" />
                    </span>
                    {selectedEvent.date}
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-accent-soft" />
                    </span>
                    {selectedEvent.time}
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin size={14} className="text-accent-soft" />
                    </span>
                    {selectedEvent.venue}
                  </p>
                </div>
              </div>
              <div className="pt-10">
                <div className="rounded-2xl bg-white/10 border border-white/15 px-5 py-4 mb-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-white/50 mb-1">Checked in</p>
                      <p className="font-display text-4xl font-semibold tabular-nums leading-none">{eventCount}</p>
                    </div>
                    <Users size={22} className="text-accent-soft mb-1" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5">
                  <div>
                    <p className="text-3xl font-display font-semibold tabular-nums leading-none">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-white/45 text-xs mt-2">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exitKiosk}
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X size={12} />
                    Exit
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex-1 flex flex-col bg-[#F7F5F2] min-w-0">
            <div className="hidden lg:block px-8 xl:px-10 py-5 border-b border-[#E4E0DA] bg-white">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-accent uppercase tracking-wider mb-1">Selected event</p>
                  <p className="font-display text-2xl font-semibold text-ink truncate">{selectedEvent.title}</p>
                  <p className="text-xs text-[#8A91A0] mt-1 truncate">
                    {selectedEvent.venue} · {selectedEvent.time}
                  </p>
                </div>
                {canChangeEvent && state === 'idle' && (
                  <button
                    type="button"
                    onClick={() => setMode('pick')}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6578] border border-[#E4E0DA] rounded-md px-3 py-2 hover:bg-[#F8F6F3]"
                  >
                    <ArrowLeft size={12} />
                    Change
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 px-4 sm:px-8 lg:px-10 py-6 sm:py-10">
              {state === 'idle' && (
                <div className="animate-fade-in w-full max-w-md mx-auto text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E4E0DA] px-3 py-1.5 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-xs font-medium text-[#5C6578]">Camera + Face ID ready</span>
                  </div>

                  <button
                    type="button"
                    onClick={beginScan}
                    className="group relative mx-auto mb-6 block focus:outline-none touch-manipulation"
                    aria-label="Start face scan check-in"
                  >
                    <div className="absolute inset-0 rounded-full bg-accent/10 scale-110" />
                    <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-white border-2 border-[#E4E0DA] group-active:border-accent/50 shadow-[0_12px_40px_rgba(31,45,77,0.08)] flex items-center justify-center">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#FBF8F3] to-[#F0EBE3] flex items-center justify-center border border-[#E8E0D4]">
                        <Fingerprint size={48} strokeWidth={1.25} className="text-primary" />
                      </div>
                    </div>
                  </button>

                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
                    Check in with live Face Scan
                  </h2>
                  <p className="text-[#5C6578] text-sm leading-relaxed px-2">
                    You’ll see yourself on camera while we scan, then Face ID verifies you for{' '}
                    <span className="font-medium text-ink">{selectedEvent.title}</span>.
                  </p>

                  {scanError && (
                    <p className="mt-4 text-left text-xs text-danger bg-[#F8EDE9] border border-[#E8C9C3] rounded-lg px-3 py-2.5">
                      {scanError}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-5 mt-6 text-xs text-[#8A91A0]">
                    <span className="inline-flex items-center gap-1.5">
                      <Fingerprint size={13} className="text-accent" />
                      Live preview
                    </span>
                    <span className="w-px h-3 bg-[#D4CFC7]" />
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-accent" />
                      Secure Face ID
                    </span>
                  </div>

                  <div className="hidden sm:flex mt-8 justify-center">
                    <button
                      type="button"
                      onClick={beginScan}
                      className="px-6 py-3.5 rounded-xl text-sm font-medium bg-primary text-white touch-manipulation"
                    >
                      Start face scan
                    </button>
                  </div>

                  {canChangeEvent && (
                    <button
                      type="button"
                      onClick={() => setMode('pick')}
                      className="lg:hidden mt-6 text-xs text-[#8A91A0] inline-flex items-center gap-1"
                    >
                      <ArrowLeft size={12} /> Change event
                    </button>
                  )}
                </div>
              )}

              {state === 'scanning' && (
                <FaceScanCapture
                  mode="checkin"
                  onAuthenticate={runCheckInAuth}
                  onCancel={() => {
                    setScanError('')
                    setState('idle')
                  }}
                  onSuccess={() => {
                    setState('success')
                    window.setTimeout(() => {
                      setState('idle')
                      setSuccessData(null)
                    }, 4500)
                  }}
                />
              )}

              {state === 'success' && successData && (
                <div className="animate-fade-in w-full max-w-md mx-auto text-center py-4">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border ${
                      successData.alreadyCheckedIn
                        ? 'bg-[#F5F0E8] border-[#E8E0D4]'
                        : 'bg-[#E8F2EC] border-[#C5DCCE]'
                    }`}
                  >
                    {successData.alreadyCheckedIn ? (
                      <ShieldCheck size={26} className="text-accent" strokeWidth={2} />
                    ) : (
                      <Check size={26} className="text-success" strokeWidth={2.25} />
                    )}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={successData.avatar}
                    alt={successData.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-md"
                  />
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-1">
                    {successData.alreadyCheckedIn
                      ? 'Already checked in'
                      : `Welcome, ${successData.name.split(' ')[0]}`}
                  </h2>
                  <p className="text-sm text-[#5C6578] mb-1">
                    {successData.alreadyCheckedIn
                      ? `${successData.name} is already on the attendance list for this event.`
                      : successData.dept}
                  </p>
                  <p className="text-xs text-[#A8AEB8] mb-6">{successData.id}</p>
                  <div className="bg-white border border-[#E4E0DA] rounded-2xl p-4 text-left space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F0EBE3] flex items-center justify-center">
                        <CalendarDays size={15} className="text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#8A91A0]">
                          {successData.alreadyCheckedIn ? 'Event' : 'Checked in for'}
                        </p>
                        <p className="text-sm font-medium text-ink truncate">{successData.eventTitle}</p>
                      </div>
                    </div>
                    <div className="h-px bg-[#EDE9E4]" />
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          successData.alreadyCheckedIn ? 'bg-[#F5F0E8]' : 'bg-[#E8F2EC]'
                        }`}
                      >
                        {successData.alreadyCheckedIn ? (
                          <Users size={15} className="text-accent" />
                        ) : (
                          <Clock size={15} className="text-success" />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] text-[#8A91A0]">
                          {successData.alreadyCheckedIn ? 'Attendance count' : 'Time'}
                        </p>
                        <p className="text-sm font-medium text-ink">
                          {successData.alreadyCheckedIn
                            ? `${eventCount} checked in · not counted twice`
                            : currentTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {state === 'failed' && (
                <div className="animate-fade-in w-full max-w-md mx-auto text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[#F8EDE9] border border-[#E8C9C3] flex items-center justify-center mx-auto mb-5">
                    <AlertCircle size={26} className="text-danger" strokeWidth={1.75} />
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
                    Not recognized
                  </h2>
                  <p className="text-sm text-[#5C6578] mb-6 leading-relaxed px-2">
                    {scanError || 'Try the face scan again, or ask an usher for help.'}
                  </p>
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={beginScan}
                      className="btn-primary w-full py-3.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <RotateCcw size={15} />
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanError('')
                        setState('idle')
                      }}
                      className="w-full py-3 rounded-xl text-sm font-medium text-[#5C6578]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {state === 'idle' && (
        <div className="sm:hidden shrink-0 border-t border-[#E4E0DA] bg-white px-4 pt-3 safe-pb shadow-[0_-8px_24px_rgba(31,45,77,0.06)]">
          <button
            type="button"
            onClick={beginScan}
            className="w-full py-3.5 rounded-xl text-sm font-medium bg-primary text-white touch-manipulation"
          >
            Start face scan
          </button>
        </div>
      )}
    </div>
  )
}

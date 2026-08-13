import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Plus, Users, MapPin, Clock, Fingerprint, Search, X, Tag, ImagePlus, Trash2, Pencil,
} from 'lucide-react'
import { useCheckIn, type ChurchEvent } from '../context/CheckInContext'
import { useDepartments } from '../context/DepartmentsContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../lib/api'
import { localCover } from '../lib/avatars'

const filterTypes = ['All Types', 'Service', 'Conference', 'Crusade', 'Prayer', 'Youth', 'Wedding', 'Funeral', 'Outreach']

const programmeSuggestions = [
  'Sunday / Church Service',
  'Prayer Meeting',
  'Youth Programme',
  'Conference / Summit',
  'Crusade / Outreach',
  'Wedding',
  'Funeral / Memorial',
  'Community Outreach',
  'Baptism Service',
  'Choir Night',
]

const venueSuggestions = [
  'Main Auditorium',
  'Conference Hall B',
  'Fellowship Hall',
  'Youth Chapel',
  'Prayer Room',
  'Open Field',
  'North Campus',
  'East Campus',
]

const programmeStyles: Record<string, { color: string; bg: string; img: string }> = {
  Service: {
    color: '#1F2D4D',
    bg: '#F0EBE3',
    img: localCover('Service', '#1F2D4D'),
  },
  Prayer: {
    color: '#2F6B4F',
    bg: '#E8F2EC',
    img: localCover('Prayer', '#2F6B4F'),
  },
  Youth: {
    color: '#5B4B8A',
    bg: '#F3F0F8',
    img: localCover('Youth', '#5B4B8A'),
  },
  Conference: {
    color: '#5B4B8A',
    bg: '#F3F0F8',
    img: localCover('Conference', '#5B4B8A'),
  },
  Crusade: {
    color: '#B54A3F',
    bg: '#F8EDE9',
    img: localCover('Crusade', '#B54A3F'),
  },
  Wedding: {
    color: '#8B5A6B',
    bg: '#F8F0F3',
    img: localCover('Wedding', '#8B5A6B'),
  },
  Funeral: {
    color: '#5C6578',
    bg: '#F3F1EE',
    img: localCover('Memorial', '#5C6578'),
  },
  Outreach: {
    color: '#2F6B4F',
    bg: '#E8F2EC',
    img: localCover('Outreach', '#2F6B4F'),
  },
}

function formatDisplayDate(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayTime(time: string) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function formatEventDateRange(start: string, end: string) {
  const startLabel = formatDisplayDate(start)
  if (!end || end === start) return startLabel
  return `${startLabel} – ${formatDisplayDate(end)}`
}

function formatEventTimeRange(start: string, end: string) {
  const startLabel = formatDisplayTime(start)
  const endLabel = formatDisplayTime(end)
  if (!endLabel) return startLabel
  return `${startLabel} – ${endLabel}`
}

const emptyForm = {
  title: '',
  programme: '',
  startDate: '',
  endDate: '',
  startTime: '09:00',
  endTime: '12:00',
  dateLabel: '',
  timeLabel: '',
  venue: '',
  capacity: '500',
  image: '',
  imageName: '',
  biometricOn: true,
  status: 'Upcoming' as ChurchEvent['status'],
  departmentId: '',
}

export default function Events() {
  const router = useRouter()
  const { events, loading, error, refreshEvents, getEventCheckInCount, addEvent, updateEvent, deleteEvent } = useCheckIn()
  const { departments } = useDepartments()
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ChurchEvent | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChurchEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = events.filter(e => {
    if (filter === 'upcoming' && e.status === 'Completed') return false
    if (filter === 'completed' && e.status !== 'Completed') return false
    if (typeFilter !== 'All Types' && e.type !== typeFilter) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const openCheckIn = (eventId: string) => {
    router.push(`/app/check-in?event=${encodeURIComponent(eventId)}`)
  }

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setErrors([])
    setEditing(null)
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (event: ChurchEvent) => {
    setEditing(event)
    setForm({
      ...emptyForm,
      title: event.title,
      programme: event.type,
      dateLabel: event.date,
      timeLabel: event.time,
      venue: event.venue,
      capacity: String(event.capacity),
      image: event.img?.startsWith('data:') || event.img?.startsWith('http') ? event.img : '',
      imageName: '',
      biometricOn: event.biometric,
      status: event.status,
      departmentId: event.departmentId || '',
    })
    setErrors([])
    setShowForm(true)
  }

  const handleImageUpload = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors(['Please choose an image file (JPG, PNG, or WebP)'])
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(['Image should be under 5MB'])
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateForm('image', String(reader.result || ''))
      updateForm('imageName', file.name)
      setErrors([])
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    updateForm('image', '')
    updateForm('imageName', '')
  }

  const previewProgramme = form.programme.trim() || 'Service'
  const previewStyleKey =
    Object.keys(programmeStyles).find(key =>
      previewProgramme.toLowerCase().includes(key.toLowerCase()),
    ) ?? 'Service'
  const previewStyle = programmeStyles[previewStyleKey] ?? programmeStyles.Service
  const cardPreviewImage = form.image || previewStyle.img

  const handleSave = async () => {
    const programme = form.programme.trim()
    const venue = form.venue.trim()
    const isEdit = Boolean(editing)

    const nextErrors: string[] = []
    if (!form.title.trim()) nextErrors.push('Add an event title')
    if (!programme) nextErrors.push('Enter a programme type')
    if (!venue) nextErrors.push('Enter a venue / location')

    if (isEdit) {
      if (!form.dateLabel.trim()) nextErrors.push('Enter a date label')
      if (!form.timeLabel.trim()) nextErrors.push('Enter a time label')
    } else {
      if (!form.startDate) nextErrors.push('Choose a start date')
      if (!form.startTime) nextErrors.push('Choose a start time')
      if (form.endDate && form.startDate && form.endDate < form.startDate) {
        nextErrors.push('End date can’t be before the start date')
      }
    }

    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }

    const styleKey =
      Object.keys(programmeStyles).find((key) =>
        programme.toLowerCase().includes(key.toLowerCase()),
      ) ?? 'Service'
    const style = programmeStyles[styleKey] ?? programmeStyles.Service
    const endDate = form.endDate || form.startDate
    const capacity = Math.max(1, Number(form.capacity) || 500)
    const date = isEdit
      ? form.dateLabel.trim()
      : formatEventDateRange(form.startDate, endDate)
    const time = isEdit
      ? form.timeLabel.trim()
      : formatEventTimeRange(form.startTime, form.endTime)

    setSaving(true)
    setErrors([])
    try {
      if (editing) {
        await updateEvent(editing.id, {
          title: form.title.trim(),
          type: programme,
          date,
          time,
          venue,
          capacity,
          color: style.color,
          bg: style.bg,
          status: form.status,
          biometric: form.biometricOn,
          img: form.image || style.img,
          departmentId: form.departmentId || null,
        })
        closeForm()
      } else {
        const event = await addEvent({
          title: form.title.trim(),
          type: programme,
          date,
          time,
          venue,
          capacity,
          registered: 0,
          color: style.color,
          bg: style.bg,
          status: 'Upcoming',
          biometric: form.biometricOn,
          img: form.image || style.img,
          departmentId: form.departmentId || null,
        })
        closeForm()
        if (event.biometric) openCheckIn(event.id)
      }
    } catch (err) {
      setErrors([err instanceof ApiError ? err.message : 'Could not save event'])
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEvent(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setErrors([err instanceof ApiError ? err.message : 'Could not delete event'])
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const programmeFilterOptions = [
    'All Types',
    ...Array.from(
      new Set([
        ...filterTypes.slice(1),
        ...events.map(e => e.type),
      ]),
    ),
  ]

  const upcomingCount = events.filter(e => e.status !== 'Completed').length
  const canSubmit = editing
    ? form.title.trim() && form.programme.trim() && form.dateLabel.trim() && form.timeLabel.trim() && form.venue.trim()
    : form.title.trim() && form.programme.trim() && form.startDate && form.startTime && form.venue.trim()

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Events</h2>
          <p className="text-[#8A91A0] text-sm mt-0.5">
            {upcomingCount} active · synced with the database
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md"
        >
          <Plus size={16} /> Create event
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-[#FBEAEA] border border-[#F0C9C9] px-3 py-2.5 text-xs text-danger flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void refreshEvents()} className="font-medium underline shrink-0">
            Retry
          </button>
        </div>
      )}

      {loading && events.length === 0 && (
        <div className="panel rounded-lg p-10 text-center text-sm text-[#8A91A0]">
          Loading events from database…
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 border-b border-[#E4E0DA] sm:border-0">
          {(['all', 'upcoming', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-medium capitalize border-b-2 sm:border sm:rounded-md transition-colors ${
                filter === f
                  ? 'border-primary text-ink sm:bg-white sm:border-[#E4E0DA]'
                  : 'border-transparent text-[#8A91A0] hover:text-[#5C6578]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E4E0DA] rounded-md px-3 py-2 flex-1">
          <Search size={13} className="text-[#A8AEB8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="bg-transparent text-sm text-ink placeholder-[#A8AEB8] outline-none w-full"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="input-field px-3 py-2 rounded-md text-sm text-ink"
        >
          {programmeFilterOptions.map(t => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(e => {
          const checkedIn = getEventCheckInCount(e.id)
          const canCheckIn = e.biometric && e.status !== 'Completed'
          return (
            <div key={e.id} className="panel rounded-lg overflow-hidden flex flex-col">
              <div className="relative h-32 bg-[#EDE9E4] overflow-hidden">
                <img src={e.img} alt={e.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="bg-white/95 text-[11px] font-medium px-2 py-0.5 rounded text-ink">
                    {e.type}
                  </span>
                  {e.biometric && (
                    <span className="bg-primary/90 text-white text-[11px] font-medium px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Fingerprint size={10} /> Fingerprint
                    </span>
                  )}
                </div>
                <span
                  className={`absolute top-3 right-3 text-[11px] font-medium px-2 py-0.5 rounded ${
                    e.status === 'Live'
                      ? 'bg-success text-white'
                      : e.status === 'Upcoming'
                        ? 'bg-white/90 text-ink'
                        : 'bg-ink/50 text-white'
                  }`}
                >
                  {e.status}
                </span>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-ink text-sm mb-2.5 leading-snug">{e.title}</h3>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-[#5C6578] text-xs">
                    <Calendar size={12} className="text-accent shrink-0" /> {e.date}
                  </div>
                  <div className="flex items-center gap-2 text-[#5C6578] text-xs">
                    <Clock size={12} className="text-accent shrink-0" /> {e.time}
                  </div>
                  <div className="flex items-center gap-2 text-[#5C6578] text-xs">
                    <MapPin size={12} className="text-accent shrink-0" /> {e.venue}
                  </div>
                </div>

                {e.biometric ? (
                  <div className="mb-4 rounded-md bg-[#F8F6F3] border border-[#E4E0DA] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5C6578] flex items-center gap-1.5">
                        <Fingerprint size={12} className="text-accent" />
                        Checked in
                      </span>
                      <span className="font-display text-xl font-semibold text-ink tabular-nums">
                        {checkedIn}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#EDE9E4] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((checkedIn / e.capacity) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#A8AEB8] mt-1.5">
                      of {e.capacity.toLocaleString()} capacity
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-[#5C6578] mb-1.5">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> Registered
                      </span>
                      <span className="font-medium text-ink">
                        {e.registered.toLocaleString()} / {e.capacity.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#EDE9E4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((e.registered / e.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-md border border-[#E4E0DA] text-xs font-medium text-[#5C6578] hover:bg-[#F8F6F3]"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(e)}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-[#E4E0DA] text-[#8A91A0] hover:text-danger hover:bg-[#F8EDE9]"
                      title="Delete event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {canCheckIn ? (
                    <button
                      type="button"
                      onClick={() => openCheckIn(e.id)}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-medium"
                    >
                      <Fingerprint size={14} />
                      Open check-in
                    </button>
                  ) : (
                    <p className="text-center text-xs text-[#A8AEB8] py-1">
                      {e.status === 'Completed'
                        ? e.biometric
                          ? `${checkedIn} attended via fingerprint`
                          : 'Event completed'
                        : 'Fingerprint check-in off'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <div className="panel rounded-lg p-10 text-center text-sm text-[#8A91A0]">
          {events.length === 0
            ? 'No events in the database yet. Create one to get started.'
            : 'No events match your filters.'}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-in shadow-lg">
            <div className="sticky top-0 bg-white border-b border-[#E4E0DA] px-5 sm:px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {editing ? 'Edit event' : 'Create event'}
                </h3>
                <p className="text-xs text-[#8A91A0] mt-0.5">
                  {editing ? 'Update schedule, venue, and check-in settings' : 'Programme, calendar, and venue'}
                </p>
              </div>
              <button type="button" onClick={closeForm} className="text-[#8A91A0] hover:text-ink p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-5">
              {errors.length > 0 && (
                <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5">
                  {errors.map(err => (
                    <p key={err} className="text-xs text-danger">{err}</p>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Event title</label>
                <input
                  value={form.title}
                  onChange={e => updateForm('title', e.target.value)}
                  placeholder="e.g. Midweek Prayer Night"
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                />
              </div>

              <div className="rounded-md border border-[#E4E0DA] overflow-hidden">
                <div className="relative h-36 bg-[#EDE9E4]">
                  <img
                    src={cardPreviewImage}
                    alt="Event card preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-semibold truncate">
                      {form.title.trim() || 'Your event title'}
                    </p>
                    <p className="text-white/70 text-[11px] mt-0.5">
                      Card preview · {form.image ? 'Custom photo' : 'Default programme image'}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={14} className="text-accent" />
                    <p className="text-sm font-medium text-ink">Event cover image</p>
                  </div>
                  <p className="text-[11px] text-[#8A91A0] leading-relaxed">
                    Upload a photo to beautify the event card. JPG, PNG, or WebP · max 5MB.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-[#E4E0DA] bg-[#F8F6F3] text-sm font-medium text-ink cursor-pointer hover:bg-[#F3F1EE] transition-colors">
                      <ImagePlus size={15} className="text-accent" />
                      {form.image ? 'Change photo' : 'Upload photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={e => handleImageUpload(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        onClick={clearImage}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border border-[#E4E0DA] text-sm text-[#5C6578] hover:bg-[#F8EDE9] hover:text-danger transition-colors"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>

                  {form.imageName && (
                    <p className="text-[11px] text-[#8A91A0] truncate">Selected: {form.imageName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#5C6578] mb-1.5">
                  <Tag size={12} className="text-accent" />
                  Programme type
                </label>
                <input
                  list="programme-suggestions"
                  value={form.programme}
                  onChange={e => updateForm('programme', e.target.value)}
                  placeholder="Type any programme — e.g. Baptism Service, Choir Night"
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                />
                <datalist id="programme-suggestions">
                  {programmeSuggestions.map(p => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {programmeSuggestions.slice(0, 6).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateForm('programme', p)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                        form.programme === p
                          ? 'border-primary bg-primary text-white'
                          : 'border-[#E4E0DA] bg-[#F8F6F3] text-[#5C6578] hover:border-[#C9C3BA]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#A8AEB8] mt-1.5">
                  Type your own, or tap a suggestion
                </p>
              </div>

              <div className="rounded-md border border-[#E4E0DA] bg-[#F8F6F3] p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-accent" />
                  <p className="text-sm font-medium text-ink">Date & time</p>
                </div>

                {editing ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Date label</label>
                      <input
                        value={form.dateLabel}
                        onChange={(e) => updateForm('dateLabel', e.target.value)}
                        placeholder="e.g. Aug 10, 2026"
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Time label</label>
                      <input
                        value={form.timeLabel}
                        onChange={(e) => updateForm('timeLabel', e.target.value)}
                        placeholder="e.g. 9:00 AM – 12:00 PM"
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Start date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => {
                          updateForm('startDate', e.target.value)
                          if (!form.endDate || form.endDate < e.target.value) {
                            updateForm('endDate', e.target.value)
                          }
                        }}
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">End date</label>
                      <input
                        type="date"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        onChange={(e) => updateForm('endDate', e.target.value)}
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Starts</label>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => updateForm('startTime', e.target.value)}
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Ends</label>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(e) => updateForm('endTime', e.target.value)}
                        className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                  </div>
                )}

                {!editing && form.startDate && (
                  <p className="text-xs text-[#5C6578] bg-white border border-[#E4E0DA] rounded-md px-3 py-2">
                    <span className="font-medium text-ink">Scheduled: </span>
                    {formatEventDateRange(form.startDate, form.endDate || form.startDate)}
                    {form.startTime ? ` · ${formatEventTimeRange(form.startTime, form.endTime)}` : ''}
                  </p>
                )}
              </div>

              <div className="rounded-md border border-[#E4E0DA] bg-white p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-accent" />
                  <p className="text-sm font-medium text-ink">Location</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Venue / location</label>
                  <input
                    list="venue-suggestions"
                    value={form.venue}
                    onChange={e => updateForm('venue', e.target.value)}
                    placeholder="Type any location — e.g. Community Centre, Pastor’s residence"
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                  <datalist id="venue-suggestions">
                    {venueSuggestions.map(v => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {venueSuggestions.slice(0, 5).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateForm('venue', v)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                          form.venue === v
                            ? 'border-primary bg-primary text-white'
                            : 'border-[#E4E0DA] bg-[#F8F6F3] text-[#5C6578] hover:border-[#C9C3BA]'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#A8AEB8] mt-1.5">
                    Type your own venue, or tap a suggestion
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Expected capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateForm('capacity', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Linked department (optional)</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => updateForm('departmentId', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {editing && (
                  <div>
                    <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => updateForm('status', e.target.value as ChurchEvent['status'])}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Live">Live</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => updateForm('biometricOn', !form.biometricOn)}
                className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                  form.biometricOn ? 'border-accent/40 bg-[#F5F0E8]' : 'border-[#E4E0DA] bg-[#F8F6F3]'
                }`}
              >
                <Fingerprint size={18} className={form.biometricOn ? 'text-accent' : 'text-[#A8AEB8]'} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">Fingerprint check-in</p>
                  <p className="text-[11px] text-[#8A91A0]">Members scan at the door for this event</p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full relative transition-colors ${
                    form.biometricOn ? 'bg-primary' : 'bg-[#D4CFC7]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                      form.biometricOn ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E4E0DA] px-5 sm:px-6 py-4 flex gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-2.5 border border-[#E4E0DA] text-[#5C6578] rounded-md text-sm hover:bg-[#F3F1EE]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSubmit || saving}
                className="flex-1 btn-primary py-2.5 text-sm font-medium rounded-md disabled:opacity-40"
              >
                {saving
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : form.biometricOn
                      ? 'Create & open check-in'
                      : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete event?"
        message={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently removed from the events calendar.`
            : ''
        }
        detail="Check-in history stored locally for this event will also be cleared. This cannot be undone."
        confirmLabel="Delete event"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

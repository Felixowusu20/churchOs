import { useMemo, useState, useRef, type ReactNode } from 'react'
import {
  Search, Plus, Eye, Trash2, Phone, Calendar, MapPin,
  Fingerprint, ChevronLeft, User, ImagePlus, Church, X,
  ShieldCheck, Check, ArrowLeft, Pencil
} from 'lucide-react'
import {
  useMembers,
  memberGenders,
  teachingClasses,
  maritalStatuses,
  formatMemberDate,
  type Member,
} from '../context/MembersContext'
import { useDepartments } from '../context/DepartmentsContext'
import { useOrg } from '../context/OrgContext'
import { api, uploadImage, ApiError } from '../lib/api'
import { localAvatar } from '../lib/avatars'
import { memberDepartments } from '../lib/members'
import { phonesMatch } from '../lib/phone'
import ConfirmDialog from '../components/ConfirmDialog'
import FaceScanCapture from '../components/FaceScanCapture'
import { enrollFingerprint, isWebAuthnAvailable } from '../lib/webauthn'

type View = 'list' | 'register' | 'edit' | 'profile'
type RegStep = 'details' | 'fingerprint'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm = {
  id: '',
  name: '',
  gender: '',
  dob: '',
  phone: '',
  address: '',
  teachingClass: '',
  dept: '',
  baptized: '',
  dateJoined: todayIso(),
  occupation: '',
  maritalStatus: '',
  emergencyContact: '',
  avatar: '',
}

const fieldClass = 'input-field w-full px-3 py-2.5 rounded-md text-sm text-ink'
const labelClass = 'block text-xs font-medium text-[#5C6578] mb-1.5'

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className={labelClass}>
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  )
}

export default function Members() {
  const { members, loading, error: membersError, peekNextId, addMember, updateMember, removeMember } = useMembers()
  const { names: departmentNames } = useDepartments()
  const deptOptions = departmentNames.length ? departmentNames : [...memberDepartments]
  const { church } = useOrg()
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<Member | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [regStep, setRegStep] = useState<RegStep>('details')
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [fpState, setFpState] = useState<'idle' | 'scanning' | 'success'>('idle')
  const [fingerprintDone, setFingerprintDone] = useState(false)
  const [fingerprintCredentialId, setFingerprintCredentialId] = useState('')
  const [fpError, setFpError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [listToast, setListToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingCredentialRef = useRef('')
  const pendingSnapshotRef = useRef('')

  const previewId = useMemo(() => peekNextId(), [peekNextId, members.length, view, regStep])

  const filtered = members.filter(m => {
    if (deptFilter !== 'All' && m.dept !== deptFilter) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.teachingClass.toLowerCase().includes(q)
    )
  })

  const resetRegister = () => {
    setForm({ ...emptyForm, dateJoined: todayIso(), id: peekNextId() })
    setErrors([])
    setRegStep('details')
    setFpState('idle')
    setFingerprintDone(false)
    setFingerprintCredentialId('')
    setFpError('')
    setSuccessNotice('')
    pendingCredentialRef.current = ''
    pendingSnapshotRef.current = ''
  }

  const openRegister = () => {
    resetRegister()
    setView('register')
  }

  const openEdit = (member: Member) => {
    setSelected(member)
    setForm({
      id: member.id,
      name: member.name,
      gender: member.gender,
      dob: member.dob,
      phone: member.phone,
      address: member.address,
      teachingClass: member.teachingClass,
      dept: member.dept,
      baptized: member.baptized ? 'yes' : 'no',
      dateJoined: member.dateJoined,
      occupation: member.occupation,
      maritalStatus: member.maritalStatus,
      emergencyContact: member.emergencyContact,
      avatar: member.avatar,
    })
    setErrors([])
    setView('edit')
  }

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handlePhoto = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => updateForm('avatar', String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const storeAvatar = async (chosen: string) => {
    if (!chosen) return undefined
    if (chosen.startsWith('data:') && !chosen.includes('image/svg')) {
      const blob = await (await fetch(chosen)).blob()
      const file = new File([blob], 'member-photo.jpg', { type: blob.type || 'image/jpeg' })
      const uploaded = await uploadImage(file, 'members')
      return uploaded.url
    }
    return chosen
  }

  const memberPayload = (avatarUrl?: string) => ({
    id: form.id.trim(),
    name: form.name,
    gender: form.gender,
    dob: form.dob,
    phone: form.phone,
    address: form.address,
    teachingClass: form.teachingClass,
    dept: form.dept,
    baptized: form.baptized === 'yes',
    dateJoined: form.dateJoined,
    occupation: form.occupation,
    maritalStatus: form.maritalStatus,
    emergencyContact: form.emergencyContact,
    avatar: avatarUrl,
  })

  const saveMemberEdits = async () => {
    if (!selected) return
    const nextErrors = validateDetails(true)
    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }
    setSaving(true)
    setErrors([])
    try {
      const avatarUrl = await storeAvatar(form.avatar)
      const saved = await updateMember(selected.id, memberPayload(avatarUrl ?? form.avatar))
      setSelected(saved)
      setListToast(`${saved.name} (${saved.id}) was updated.`)
      setView('list')
      window.setTimeout(() => setListToast(''), 6000)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not update member'
      setErrors([message])
    } finally {
      setSaving(false)
    }
  }

  const goToFingerprint = () => {
    const nextErrors = validateDetails(false)
    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }
    setErrors([])
    setFpState('idle')
    setFingerprintDone(false)
    setFingerprintCredentialId('')
    setFpError('')
    setRegStep('fingerprint')
  }

  const validateDetails = (isEdit: boolean) => {
    const nextErrors: string[] = []
    const memberId = form.id.trim()
    if (!memberId) nextErrors.push('Member ID is required')
    else if (memberId.length < 2 || memberId.length > 40) nextErrors.push('Member ID must be between 2 and 40 characters')
    else {
      const taken = members.find(
        (m) =>
          m.id.toLowerCase() === memberId.toLowerCase() &&
          (!isEdit || m.id.toLowerCase() !== selected?.id.toLowerCase()),
      )
      if (taken) {
        nextErrors.push(`${taken.name} (${taken.id}) is already using this member ID.`)
      }
    }
    if (!form.name.trim()) nextErrors.push('Full name is required')
    if (!form.gender) nextErrors.push('Gender is required')
    if (!form.dob) nextErrors.push('Date of birth is required')
    if (!form.phone.trim()) nextErrors.push('Phone is required')
    if (!form.address.trim()) nextErrors.push('Address is required')
    if (!form.teachingClass) nextErrors.push('Teaching class is required')
    if (!form.dept) nextErrors.push('Department is required')
    if (form.baptized === '') nextErrors.push('Baptized status is required')
    if (!form.dateJoined) nextErrors.push('Date joined is required')
    if (!form.occupation.trim()) nextErrors.push('Occupation is required')
    if (!form.maritalStatus) nextErrors.push('Marital status is required')
    if (!form.emergencyContact.trim()) nextErrors.push('Emergency contact is required')

    if (form.phone.trim()) {
      const existing = members.find(
        (m) =>
          m.status === 'Active' &&
          phonesMatch(m.phone, form.phone) &&
          (!isEdit || m.id !== selected?.id),
      )
      if (existing) {
        nextErrors.push(
          `${existing.name} (${existing.id}) is already registered with this phone number.`,
        )
      }
    }

    return nextErrors
  }

  const startScan = () => {
    setFpError('')
    pendingCredentialRef.current = ''
    pendingSnapshotRef.current = ''
    if (!isWebAuthnAvailable()) {
      setFpError('Open this page in Safari on your iPhone to use Face ID / Touch ID.')
      return
    }
    setFpState('scanning')
  }

  const runEnrollmentAuth = async () => {
    const existing = await api<{
      credentials: { memberCode: string; name: string; credentialId: string }[]
    }>('/api/members/fingerprint-credentials').catch(() => ({
      credentials: [] as { memberCode: string; name: string; credentialId: string }[],
    }))

    const result = await enrollFingerprint(form.name.trim() || 'Church member')

    const taken = existing.credentials.find((c) => c.credentialId === result.credentialId)
    if (taken) {
      throw new Error(
        `${taken.name} (${taken.memberCode}) is already registered with this Face ID on this device.`,
      )
    }

    pendingCredentialRef.current = result.credentialId
    setFingerprintCredentialId(result.credentialId)
    setFingerprintDone(true)
  }

  const completeRegistration = async (
    withFingerprint: boolean,
    overrides?: { credentialId?: string; snapshotAvatar?: string },
  ) => {
    setSaving(true)
    setErrors([])
    setFpError('')
    try {
      const credentialId = overrides?.credentialId || pendingCredentialRef.current || fingerprintCredentialId
      // Prefer the profile photo the user set — never replace it with a camera snapshot
      const chosenAvatar = form.avatar || overrides?.snapshotAvatar || pendingSnapshotRef.current || ''
      const avatarUrl = await storeAvatar(chosenAvatar)

      const useFp = withFingerprint && Boolean(credentialId)
      const saved = await addMember({
        ...memberPayload(avatarUrl),
        fingerprintEnrolled: useFp,
        fingerprintCredentialId: useFp ? credentialId : undefined,
      })
      pendingCredentialRef.current = ''
      pendingSnapshotRef.current = ''
      setSuccessNotice(
        `${saved.name} (${saved.id}) was successfully added${useFp ? ' with Face ID' : ''}.`,
      )
      setFpState('success')
      const notice = `${saved.name} (${saved.id}) was successfully added${useFp ? ' with Face ID' : ''}.`
      window.setTimeout(() => {
        resetRegister()
        setListToast(notice)
        setView('list')
        window.setTimeout(() => setListToast(''), 6000)
      }, 1600)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save member'
      setErrors([message])
      setFpError(message)
      setFpState('idle')
      if (!/already registered/i.test(message)) {
        setRegStep('details')
      }
    } finally {
      setSaving(false)
    }
  }

  const finishAfterFaceScan = async () => {
    await completeRegistration(true, {
      credentialId: pendingCredentialRef.current,
      snapshotAvatar: form.avatar ? undefined : pendingSnapshotRef.current,
    })
  }

  if (view === 'profile' && selected) {
    const facts = [
      { label: 'Member ID', value: selected.id },
      { label: 'Gender', value: selected.gender },
      { label: 'Date of birth', value: formatMemberDate(selected.dob) },
      { label: 'Phone', value: selected.phone },
      { label: 'Address', value: selected.address },
      { label: 'Teaching class', value: selected.teachingClass },
      { label: 'Department', value: selected.dept },
      { label: 'Baptized', value: selected.baptized ? 'Yes' : 'No' },
      { label: 'Date joined', value: formatMemberDate(selected.dateJoined) },
      { label: 'Occupation', value: selected.occupation },
      { label: 'Marital status', value: selected.maritalStatus },
      { label: 'Emergency contact', value: selected.emergencyContact },
    ]

    return (
      <div className="p-4 sm:p-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-[#8A91A0] hover:text-ink text-sm"
          >
            <ChevronLeft size={16} /> Back to members
          </button>
          <button
            type="button"
            onClick={() => openEdit(selected)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-[#E4E0DA] rounded-md px-3 py-1.5 hover:bg-[#F8F6F3]"
          >
            <Pencil size={12} />
            Edit profile
          </button>
        </div>

        <div className="panel rounded-lg p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-5 items-start mb-8">
            <button
              type="button"
              onClick={() => openEdit(selected)}
              className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 group"
              title="Change photo"
            >
              <img
                src={selected.avatar || localAvatar(selected.name)}
                alt={selected.name}
                className="w-20 h-20 rounded-full object-cover"
              />
              <span className="absolute inset-0 bg-ink/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Pencil size={16} className="text-white" />
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="font-display text-2xl font-semibold text-ink">{selected.name}</h2>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${selected.status === 'Active' ? 'bg-[#E8F2EC] text-success' : 'bg-[#F3F1EE] text-[#8A91A0]'}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-xs text-[#8A91A0] font-mono mb-3">{selected.id}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#5C6578]">
                <p className="flex items-center gap-2"><Phone size={14} className="text-accent" /> {selected.phone}</p>
                <p className="flex items-center gap-2"><MapPin size={14} className="text-accent" /> {selected.address}</p>
                <p className="flex items-center gap-2"><Calendar size={14} className="text-accent" /> Joined {formatMemberDate(selected.dateJoined)}</p>
                <p className="flex items-center gap-2">
                  <Fingerprint size={14} className={selected.fingerprintEnrolled ? 'text-success' : 'text-[#A8AEB8]'} />
                  {selected.fingerprintEnrolled ? 'Fingerprint enrolled' : 'No fingerprint yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {facts.map(f => (
              <div key={f.label} className="rounded-md border border-[#E8E0D4] bg-[#F8F6F3] px-3 py-2.5">
                <p className="text-[11px] text-[#8A91A0] mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-ink break-words">{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'register' && regStep === 'fingerprint') {
    const displayName = form.name.trim() || 'New member'
    const photo = form.avatar
    const displayId = form.id.trim() || previewId
    const goBackDetails = () => {
      setFpState('idle')
      setFingerprintDone(false)
      setFingerprintCredentialId('')
      setFpError('')
      setRegStep('details')
    }

    return (
      <div className="fixed inset-0 z-[100] bg-[#F7F5F2] flex flex-col h-[100dvh] max-h-[100dvh]">
        {/* Mobile top bar */}
        <header className="lg:hidden shrink-0 safe-pt border-b border-[#E4E0DA] bg-white px-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBackDetails}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6578] py-2"
            >
              <ArrowLeft size={14} />
              Details
            </button>
            <p className="text-[11px] font-medium text-accent uppercase tracking-wider">Step 2 · Biometric</p>
            <span className="w-14" />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col lg:flex-row lg:min-h-full">
            {/* Desktop sidebar / mobile member card */}
            <aside className="relative lg:w-[38%] lg:min-h-[100dvh] bg-primary text-white lg:sticky lg:top-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#2A3A5C]" />
              <div
                className="absolute inset-0 opacity-[0.07] hidden lg:block"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />

              {/* Compact mobile summary */}
              <div className="relative z-10 lg:hidden px-4 py-4">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    {photo ? (
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} className="text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold truncate leading-tight">{displayName}</p>
                    <p className="text-[11px] text-white/50 font-mono mt-0.5">{displayId}</p>
                    <p className="text-xs text-white/55 truncate mt-1">
                      {form.dept}
                      {form.phone ? ` · ${form.phone}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full desktop aside */}
              <div className="relative z-10 hidden lg:flex flex-col justify-between h-full px-8 xl:px-10 py-12">
                <div>
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <Church size={22} strokeWidth={1.5} className="text-accent-soft" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-semibold tracking-tight leading-none">{church.name}</p>
                      <p className="text-white/50 text-xs mt-1.5">Member registration</p>
                    </div>
                  </div>
                  <p className="text-accent-soft text-xs font-medium uppercase tracking-[0.14em] mb-3">
                    Enrolling biometric
                  </p>
                  <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.1] mb-2">{displayName}</h1>
                  <p className="text-white/45 text-xs font-mono mb-8">{displayId}</p>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm text-white/70 truncate">{form.occupation || '—'}</p>
                      <p className="text-xs text-white/45">
                        {form.gender} · {form.dept}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-white/65">
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <Phone size={14} className="text-accent-soft" />
                      </span>
                      {form.phone}
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-accent-soft" />
                      </span>
                      <span className="truncate">{form.address}</span>
                    </p>
                  </div>
                </div>
                <div className="pt-10 border-t border-white/10">
                  <p className="text-xs text-white/45 mb-4 leading-relaxed">
                    Saves Face ID / Touch ID for later door check-in — not checking anyone in now.
                  </p>
                  <button
                    type="button"
                    onClick={goBackDetails}
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X size={12} />
                    Back to details
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex-1 flex flex-col bg-[#F7F5F2] min-w-0">
              <div className="hidden lg:block px-8 xl:px-10 py-5 border-b border-[#E4E0DA] bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-accent uppercase tracking-wider mb-1">
                      Registration · step 2
                    </p>
                    <p className="font-display text-2xl font-semibold text-ink">Face ID / Touch ID</p>
                    <p className="text-xs text-[#8A91A0] mt-1">Optional — you can skip and enroll later</p>
                  </div>
                  <button
                    type="button"
                    onClick={goBackDetails}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6578] border border-[#E4E0DA] rounded-md px-3 py-2 hover:bg-[#F8F6F3]"
                  >
                    <ArrowLeft size={12} />
                    Edit details
                  </button>
                </div>
              </div>

              <div className="flex-1 px-4 sm:px-8 lg:px-10 py-6 sm:py-10 pb-8">
                {fpState === 'idle' && (
                  <div className="animate-fade-in w-full max-w-md mx-auto text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E4E0DA] px-3 py-1.5 mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-xs font-medium text-[#5C6578]">Camera + Face ID ready</span>
                    </div>

                    <button
                      type="button"
                      onClick={startScan}
                      className="group relative mx-auto mb-6 block focus:outline-none touch-manipulation"
                      aria-label="Start face enrollment"
                    >
                      <div className="absolute inset-0 rounded-full bg-accent/10 scale-110" />
                      <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-white border-2 border-[#E4E0DA] group-active:border-accent/50 shadow-[0_12px_40px_rgba(31,45,77,0.08)] flex items-center justify-center">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#FBF8F3] to-[#F0EBE3] flex items-center justify-center border border-[#E8E0D4]">
                          <Fingerprint
                            size={48}
                            strokeWidth={1.25}
                            className="text-primary group-active:text-accent transition-colors"
                          />
                        </div>
                      </div>
                    </button>

                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
                      Enroll with live Face Scan
                    </h2>
                    <p className="text-[#5C6578] text-sm leading-relaxed px-2">
                      You’ll see yourself on camera while we scan, then Safari Face ID securely binds{' '}
                      <span className="font-medium text-ink">{displayName}</span>.
                    </p>

                    {fpError && (
                      <p className="mt-4 text-left text-xs text-danger bg-[#F8EDE9] border border-[#E8C9C3] rounded-lg px-3 py-2.5">
                        {fpError}
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

                    <div className="hidden sm:flex mt-8 flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
                      <button
                        type="button"
                        onClick={startScan}
                        className="btn-primary flex-1 py-3.5 rounded-xl text-sm font-medium touch-manipulation"
                      >
                        Start face scan
                      </button>
                      <button
                        type="button"
                        onClick={() => void completeRegistration(false)}
                        disabled={saving}
                        className="flex-1 py-3.5 rounded-xl text-sm font-medium border border-[#E4E0DA] text-[#5C6578] bg-white disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Skip for now'}
                      </button>
                    </div>
                  </div>
                )}

                {fpState === 'scanning' && (
                  <FaceScanCapture
                    mode="enroll"
                    memberLabel={displayName}
                    preserveAvatar={Boolean(form.avatar)}
                    onAuthenticate={runEnrollmentAuth}
                    onFrameCapture={(dataUrl) => {
                      // Only keep a camera snapshot when the member has no profile photo yet
                      if (!form.avatar) {
                        pendingSnapshotRef.current = dataUrl
                      }
                    }}
                    onCancel={() => {
                      setFpState('idle')
                      setFingerprintDone(false)
                      setFingerprintCredentialId('')
                      pendingCredentialRef.current = ''
                      pendingSnapshotRef.current = ''
                    }}
                    onSuccess={finishAfterFaceScan}
                  />
                )}

                {fpState === 'success' && (
                  <div className="animate-fade-in w-full max-w-md mx-auto text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-[#E8F2EC] border border-[#C5DCCE] flex items-center justify-center mx-auto mb-5">
                      <Check size={26} className="text-success" strokeWidth={2.25} />
                    </div>
                    {photo ? (
                      <img
                        src={photo}
                        alt={displayName}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-md"
                      />
                    ) : pendingSnapshotRef.current ? (
                      <img
                        src={pendingSnapshotRef.current}
                        alt={displayName}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#F0EBE3] border border-[#E8E0D4] flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-[#A8AEB8]" />
                      </div>
                    )}
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
                      {saving ? 'Saving member…' : 'Member successfully added'}
                    </h2>
                    <p className="text-sm text-[#5C6578] px-3">
                      {successNotice ||
                        (saving
                          ? 'Sending Face ID credentials to the database…'
                          : `${displayName} is on the members list`)}
                    </p>
                    {saving && (
                      <div className="mt-6 mx-auto w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Sticky mobile CTAs — always reachable */}
        {fpState === 'idle' && (
          <div className="sm:hidden shrink-0 border-t border-[#E4E0DA] bg-white px-4 pt-3 safe-pb shadow-[0_-8px_24px_rgba(31,45,77,0.06)]">
            <button
              type="button"
              onClick={startScan}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-medium touch-manipulation mb-2"
            >
              Start face scan
            </button>
            <button
              type="button"
              onClick={() => void completeRegistration(false)}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-medium text-[#5C6578] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Skip for now'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (view === 'register' || view === 'edit') {
    const isEdit = view === 'edit'
    const cancelForm = () => {
      if (isEdit && selected) {
        setView('profile')
        return
      }
      resetRegister()
      setView('list')
    }

    return (
      <div className="fixed inset-0 z-[45] bg-[#F7F5F2] flex flex-col h-[100dvh] max-h-[100dvh] lg:left-60">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6">
          <div className="max-w-2xl mx-auto pb-4">
          <button
            type="button"
            onClick={cancelForm}
            className="flex items-center gap-2 text-[#8A91A0] hover:text-ink text-sm mb-5"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="mb-5">
            {!isEdit && (
              <p className="text-[11px] font-medium text-accent uppercase tracking-wider mb-1">Step 1 of 2</p>
            )}
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
              {isEdit ? 'Edit member' : 'Register member'}
            </h2>
            <p className="text-sm text-[#8A91A0] mt-1">
              {isEdit
                ? 'Update their church ID, photo, and details'
                : 'Enter their church ID and photo, then enroll Face ID on this phone'}
            </p>
          </div>

          <div className="panel rounded-lg p-4 sm:p-6 space-y-5">
            {errors.length > 0 && (
              <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 space-y-0.5">
                {errors.map(e => (
                  <p key={e} className="text-xs text-danger">{e}</p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pb-1 border-b border-[#EDE9E4]">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-16 h-16 rounded-full overflow-hidden bg-[#F3F1EE] border border-[#E4E0DA] flex items-center justify-center shrink-0 group"
                aria-label={form.avatar ? 'Change profile photo' : 'Upload profile photo'}
              >
                {form.avatar ? (
                  <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-[#C9C3BA]" />
                )}
                <span className="absolute inset-0 bg-ink/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ImagePlus size={16} className="text-white" />
                </span>
              </button>
              <div>
                <p className="text-sm font-medium text-ink mb-1">
                  Profile photo <span className="text-[#A8AEB8] font-normal">(optional)</span>
                </p>
                <p className="text-[11px] text-[#8A91A0] mb-2">Upload a real photo — you can change it anytime</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-[#E4E0DA] rounded-md px-3 py-1.5 hover:bg-[#F8F6F3]"
                  >
                    <ImagePlus size={13} />
                    {form.avatar ? 'Change photo' : 'Upload photo'}
                  </button>
                  {form.avatar ? (
                    <button
                      type="button"
                      onClick={() => updateForm('avatar', '')}
                      className="text-xs font-medium text-[#8A91A0] hover:text-danger px-2 py-1.5"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    handlePhoto(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Member ID</FieldLabel>
                <input
                  value={form.id}
                  onChange={e => updateForm('id', e.target.value)}
                  placeholder={previewId}
                  className={`${fieldClass} font-mono`}
                />
                <p className="text-[11px] text-[#8A91A0] mt-1">
                  Suggested {previewId} — replace with the church ID you already use
                </p>
              </div>
              <div>
                <FieldLabel required>Full name</FieldLabel>
                <input
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  placeholder="e.g. Ama Serwaa"
                  className={fieldClass}
                />
              </div>

              <div>
                <FieldLabel required>Gender</FieldLabel>
                <select
                  value={form.gender}
                  onChange={e => updateForm('gender', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select gender</option>
                  {memberGenders.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel required>Date of birth</FieldLabel>
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => updateForm('dob', e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <FieldLabel required>Phone</FieldLabel>
                <input
                  value={form.phone}
                  onChange={e => updateForm('phone', e.target.value)}
                  placeholder="+233 24 000 0000"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel required>Marital status</FieldLabel>
                <select
                  value={form.maritalStatus}
                  onChange={e => updateForm('maritalStatus', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select status</option>
                  {maritalStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <FieldLabel required>Address</FieldLabel>
                <textarea
                  value={form.address}
                  onChange={e => updateForm('address', e.target.value)}
                  placeholder="House no., street, area, city"
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <div>
                <FieldLabel required>Teaching class</FieldLabel>
                <select
                  value={form.teachingClass}
                  onChange={e => updateForm('teachingClass', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select class</option>
                  {teachingClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel required>Department</FieldLabel>
                <select
                  value={form.dept}
                  onChange={e => updateForm('dept', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select department</option>
                  {deptOptions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel required>Baptized</FieldLabel>
                <select
                  value={form.baptized}
                  onChange={e => updateForm('baptized', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <FieldLabel required>Date joined</FieldLabel>
                <input
                  type="date"
                  value={form.dateJoined}
                  onChange={e => updateForm('dateJoined', e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <FieldLabel required>Occupation</FieldLabel>
                <input
                  value={form.occupation}
                  onChange={e => updateForm('occupation', e.target.value)}
                  placeholder="e.g. Teacher"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel required>Emergency contact</FieldLabel>
                <input
                  value={form.emergencyContact}
                  onChange={e => updateForm('emergencyContact', e.target.value)}
                  placeholder="Name · phone number"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="hidden sm:flex gap-2 pt-2">
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 py-2.5 rounded-md text-sm border border-[#E4E0DA] text-[#5C6578] hover:bg-[#F8F6F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={isEdit ? () => void saveMemberEdits() : goToFingerprint}
                disabled={saving}
                className="flex-1 btn-primary py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {isEdit ? (saving ? 'Saving…' : 'Save changes') : 'Continue to Face ID'}
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="sm:hidden shrink-0 border-t border-[#E4E0DA] bg-white px-4 pt-3 safe-pb shadow-[0_-8px_24px_rgba(31,45,77,0.06)]">
          <button
            type="button"
            onClick={isEdit ? () => void saveMemberEdits() : goToFingerprint}
            disabled={saving}
            className="btn-primary w-full py-3.5 rounded-xl text-sm font-medium touch-manipulation disabled:opacity-50"
          >
            {isEdit ? (saving ? 'Saving…' : 'Save changes') : 'Continue to Face ID'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {listToast && (
        <div className="rounded-lg bg-[#E8F2EC] border border-[#C5DCCE] px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Check size={16} className="text-success shrink-0 mt-0.5" />
            <p className="text-sm text-[#2F6B4F]">{listToast}</p>
          </div>
          <button
            type="button"
            onClick={() => setListToast('')}
            className="text-[#8A91A0] hover:text-ink shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Members</h2>
          <p className="text-sm text-[#8A91A0] mt-0.5">
            {loading ? 'Loading from database…' : `${filtered.length} of ${members.length} · saved in database`}
          </p>
        </div>
        <button
          onClick={openRegister}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md"
        >
          <Plus size={16} />
          Register member
        </button>
      </div>

      {membersError && (
        <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
          {membersError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-[#E4E0DA] rounded-md px-3 py-2.5">
          <Search size={14} className="text-[#A8AEB8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, class, or ID…"
            className="bg-transparent text-sm text-ink placeholder-[#A8AEB8] outline-none w-full"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="input-field px-3 py-2.5 rounded-md text-sm text-ink"
        >
          <option value="All">All departments</option>
          {deptOptions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E4E0DA] bg-[#F8F6F3]">
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Member</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden sm:table-cell">Phone</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden md:table-cell">Department</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden lg:table-cell">Class</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Fingerprint</th>
                <th className="text-right text-xs font-medium text-[#8A91A0] px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8A91A0]">
                    No members match your search
                  </td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="table-row-hover border-b border-[#F0ECE7] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={m.avatar || localAvatar(m.name)} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                          <p className="text-[11px] text-[#A8AEB8] font-mono">{m.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-[#5C6578]">{m.phone}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[#5C6578]">{m.dept}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-[#5C6578]">{m.teachingClass}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.fingerprintEnrolled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                          <Fingerprint size={12} /> Enrolled
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#A8AEB8]">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setSelected(m); setView('profile') }}
                          className="p-2 text-[#8A91A0] hover:text-ink hover:bg-[#F3F1EE] rounded-md"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="p-2 text-[#8A91A0] hover:text-ink hover:bg-[#F3F1EE] rounded-md"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="p-2 text-[#8A91A0] hover:text-danger hover:bg-[#F8EDE9] rounded-md"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove member?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the membership register.`
            : ''
        }
        detail="Their department link will be cleared with the record. This cannot be undone."
        confirmLabel="Remove member"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          setDeleting(true)
          void removeMember(deleteTarget.id)
            .then(() => setDeleteTarget(null))
            .finally(() => setDeleting(false))
        }}
      />
    </div>
  )
}

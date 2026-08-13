import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Shield, Users, Clock, Fingerprint, Bell,
  UserRound, Eye, EyeOff, Check, AlertTriangle, Lock, Mail, Phone, MapPin,
  Plus, Pencil, Trash2, X,
} from 'lucide-react'
import { useOrg, type ChurchProfile, type AdminProfile } from '../context/OrgContext'
import { useAuth, type AdminUser } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import HomepageCmsEditor from '../components/HomepageCmsEditor'
import {
  ROLE_DEFINITIONS,
  SUB_ADMIN_ROLES,
  canManageStaff,
  type AdminRole,
} from '../lib/roles'

const settingsTabs = [
  { id: 'church', label: 'Church details', icon: Building2 },
  { id: 'admin', label: 'Admin account', icon: UserRound },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'roles', label: 'Staff & CMS', icon: Users },
  { id: 'schedule', label: 'Schedules', icon: Clock },
  { id: 'biometric', label: 'Devices', icon: Fingerprint },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const devices = [
  { id: 'KSK-001', location: 'Main Entrance', status: 'Online', lastSync: '2 min ago' },
  { id: 'KSK-002', location: 'South Wing', status: 'Online', lastSync: '5 min ago' },
  { id: 'KSK-003', location: 'Youth Hall', status: 'Offline', lastSync: '4 hrs ago' },
  { id: 'KSK-004', location: 'Admin Block', status: 'Online', lastSync: '1 min ago' },
]

type Toast = { type: 'success' | 'error'; message: string }

const emptyStaffForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'Secretary' as Exclude<AdminRole, 'Super Admin'>,
}

export default function Settings() {
  const { church, admin, updateChurch, updateAdmin, changePassword } = useOrg()
  const { admin: authAdmin } = useAuth()
  const isSuperAdmin = canManageStaff(authAdmin?.role)
  const [activeTab, setActiveTab] = useState('church')
  const [cmsSection, setCmsSection] = useState<'staff' | 'homepage'>('homepage')
  const [toast, setToast] = useState<Toast | null>(null)

  const [churchForm, setChurchForm] = useState<ChurchProfile>(church)
  const [adminForm, setAdminForm] = useState<AdminProfile>(admin)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [churchDirty, setChurchDirty] = useState(false)
  const [adminDirty, setAdminDirty] = useState(false)

  const [staff, setStaff] = useState<AdminUser[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null)
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [staffSaving, setStaffSaving] = useState(false)
  const [showStaffPassword, setShowStaffPassword] = useState(false)
  const [deleteStaff, setDeleteStaff] = useState<AdminUser | null>(null)
  const [deletingStaff, setDeletingStaff] = useState(false)

  useEffect(() => {
    if (!churchDirty) setChurchForm(church)
  }, [church, churchDirty])

  useEffect(() => {
    if (!adminDirty) setAdminForm(admin)
  }, [admin, adminDirty])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (type: Toast['type'], message: string) => setToast({ type, message })

  const loadStaff = useCallback(async () => {
    if (!isSuperAdmin) return
    setStaffLoading(true)
    try {
      const data = await api<{ admins: AdminUser[] }>('/api/admins')
      setStaff(data.admins)
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Could not load staff',
      })
    } finally {
      setStaffLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (activeTab === 'roles' && isSuperAdmin) void loadStaff()
  }, [activeTab, isSuperAdmin, loadStaff])

  const openCreateStaff = () => {
    setEditingStaff(null)
    setStaffForm(emptyStaffForm)
    setShowStaffPassword(false)
    setShowStaffForm(true)
  }

  const openEditStaff = (row: AdminUser) => {
    if (row.role === 'Super Admin') {
      showToast('error', 'Edit Super Admin from Admin account tab')
      return
    }
    setEditingStaff(row)
    setStaffForm({
      fullName: row.fullName,
      email: row.email,
      password: '',
      phone: row.phone || '',
      role: row.role as Exclude<AdminRole, 'Super Admin'>,
    })
    setShowStaffPassword(false)
    setShowStaffForm(true)
  }

  const saveStaff = async () => {
    if (!staffForm.fullName.trim() || !staffForm.email.trim()) {
      showToast('error', 'Name and email are required')
      return
    }
    if (!editingStaff && staffForm.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters')
      return
    }
    if (editingStaff && staffForm.password && staffForm.password.length < 6) {
      showToast('error', 'Password must be at least 6 characters')
      return
    }

    setStaffSaving(true)
    try {
      if (editingStaff) {
        await api(`/api/admins/${encodeURIComponent(editingStaff.id)}`, {
          method: 'PATCH',
          json: {
            fullName: staffForm.fullName.trim(),
            email: staffForm.email.trim(),
            phone: staffForm.phone.trim(),
            role: staffForm.role,
            ...(staffForm.password ? { password: staffForm.password } : {}),
          },
        })
        showToast('success', 'Staff account updated')
      } else {
        await api('/api/admins', {
          method: 'POST',
          json: {
            fullName: staffForm.fullName.trim(),
            email: staffForm.email.trim(),
            password: staffForm.password,
            phone: staffForm.phone.trim(),
            role: staffForm.role,
          },
        })
        showToast('success', `${staffForm.role} account created`)
      }
      setShowStaffForm(false)
      setEditingStaff(null)
      setStaffForm(emptyStaffForm)
      await loadStaff()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not save staff account')
    } finally {
      setStaffSaving(false)
    }
  }

  const confirmDeleteStaff = async () => {
    if (!deleteStaff) return
    setDeletingStaff(true)
    try {
      await api(`/api/admins/${encodeURIComponent(deleteStaff.id)}`, { method: 'DELETE' })
      showToast('success', 'Staff account deleted')
      setDeleteStaff(null)
      await loadStaff()
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not delete staff')
      setDeleteStaff(null)
    } finally {
      setDeletingStaff(false)
    }
  }

  const patchChurch = <K extends keyof ChurchProfile>(key: K, value: ChurchProfile[K]) => {
    setChurchForm(prev => ({ ...prev, [key]: value }))
    setChurchDirty(true)
  }

  const patchAdmin = <K extends keyof AdminProfile>(key: K, value: AdminProfile[K]) => {
    setAdminForm(prev => ({ ...prev, [key]: value }))
    setAdminDirty(true)
  }

  const saveChurch = () => {
    if (!churchForm.name.trim()) {
      showToast('error', 'Church name is required')
      return
    }
    if (!churchForm.email.trim()) {
      showToast('error', 'Church email is required')
      return
    }
    updateChurch({
      ...churchForm,
      name: churchForm.name.trim(),
      email: churchForm.email.trim(),
      seniorPastor: churchForm.seniorPastor.trim(),
      phone: churchForm.phone.trim(),
      address: churchForm.address.trim(),
      city: churchForm.city.trim(),
      country: churchForm.country.trim(),
      website: churchForm.website.trim(),
      denomination: churchForm.denomination.trim(),
      founded: churchForm.founded.trim(),
    })
    setChurchDirty(false)
    showToast('success', 'Church details saved')
  }

  const saveAdminProfile = () => {
    if (!adminForm.fullName.trim()) {
      showToast('error', 'Admin name is required')
      return
    }
    if (!adminForm.email.trim() || !adminForm.email.includes('@')) {
      showToast('error', 'Enter a valid admin email')
      return
    }
    updateAdmin({
      ...adminForm,
      fullName: adminForm.fullName.trim(),
      title: adminForm.title.trim(),
      email: adminForm.email.trim(),
      phone: adminForm.phone.trim(),
    })
    setAdminDirty(false)
    showToast('success', 'Admin profile updated')
  }

  const savePassword = () => {
    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match')
      return
    }
    const result = changePassword(currentPassword, newPassword)
    showToast(result.ok ? 'success' : 'error', result.message)
    if (result.ok) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Settings</h2>
        <p className="text-sm text-[#8A91A0] mt-0.5">
          Manage church details, staff accounts, and homepage content
        </p>
      </div>

      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm border ${
            toast.type === 'success'
              ? 'bg-[#E8F2EC] border-[#C5DCCE] text-success'
              : 'bg-[#F8EDE9] border-[#E8C9C3] text-danger'
          }`}
        >
          {toast.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        <aside className="lg:w-52 shrink-0">
          <div className="panel rounded-lg p-2">
            {settingsTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white font-medium'
                    : 'text-[#5C6578] hover:bg-[#F8F6F3]'
                }`}
              >
                <tab.icon size={15} strokeWidth={1.6} />
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 space-y-4 min-w-0">
          {activeTab === 'church' && (
            <div className="panel rounded-lg p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-semibold text-ink">Church details</h3>
                  <p className="text-xs text-[#8A91A0] mt-0.5">
                    This name and info appear in the sidebar and check-in screen
                  </p>
                </div>
                {churchDirty && (
                  <span className="text-[11px] text-accent bg-[#F5F0E8] border border-[#E8E0D4] px-2 py-1 rounded-md">
                    Unsaved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <Field label="Church name" required>
                  <input
                    value={churchForm.name}
                    onChange={e => patchChurch('name', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    placeholder="e.g. Grace Chapel"
                  />
                </Field>
                <Field label="Denomination">
                  <input
                    value={churchForm.denomination}
                    onChange={e => patchChurch('denomination', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </Field>
                <Field label="Senior pastor">
                  <input
                    value={churchForm.seniorPastor}
                    onChange={e => patchChurch('seniorPastor', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </Field>
                <Field label="Founded">
                  <input
                    value={churchForm.founded}
                    onChange={e => patchChurch('founded', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8AEB8]" />
                    <input
                      type="email"
                      value={churchForm.email}
                      onChange={e => patchChurch('email', e.target.value)}
                      className="input-field w-full pl-9 pr-3 py-2.5 rounded-md text-sm text-ink"
                    />
                  </div>
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8AEB8]" />
                    <input
                      value={churchForm.phone}
                      onChange={e => patchChurch('phone', e.target.value)}
                      className="input-field w-full pl-9 pr-3 py-2.5 rounded-md text-sm text-ink"
                    />
                  </div>
                </Field>
                <Field label="City">
                  <input
                    value={churchForm.city}
                    onChange={e => patchChurch('city', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </Field>
                <Field label="Country">
                  <input
                    value={churchForm.country}
                    onChange={e => patchChurch('country', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                  />
                </Field>
                <Field label="Website">
                  <input
                    value={churchForm.website}
                    onChange={e => patchChurch('website', e.target.value)}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    placeholder="www.yourchurch.org"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-3 text-[#A8AEB8]" />
                      <textarea
                        rows={2}
                        value={churchForm.address}
                        onChange={e => patchChurch('address', e.target.value)}
                        className="input-field w-full pl-9 pr-3 py-2.5 rounded-md text-sm text-ink resize-none"
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={!churchDirty}
                  onClick={() => {
                    setChurchForm(church)
                    setChurchDirty(false)
                  }}
                  className="px-4 py-2.5 rounded-md text-sm border border-[#E4E0DA] text-[#5C6578] disabled:opacity-40 hover:bg-[#F8F6F3]"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={saveChurch}
                  disabled={!churchDirty}
                  className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  <Check size={15} />
                  Save church details
                </button>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="panel rounded-lg p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-semibold text-ink">Admin profile</h3>
                    <p className="text-xs text-[#8A91A0] mt-0.5">
                      Name and contact shown in the admin portal
                    </p>
                  </div>
                  {adminDirty && (
                    <span className="text-[11px] text-accent bg-[#F5F0E8] border border-[#E8E0D4] px-2 py-1 rounded-md">
                      Unsaved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[#E4E0DA]">
                  <img
                    src={adminForm.avatar}
                    alt={adminForm.fullName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-ink">{adminForm.fullName || 'Admin name'}</p>
                    <p className="text-xs text-[#8A91A0]">{adminForm.role}</p>
                    <p className="text-xs text-[#A8AEB8] mt-0.5">{adminForm.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <Field label="Full name" required>
                    <input
                      value={adminForm.fullName}
                      onChange={e => patchAdmin('fullName', e.target.value)}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    />
                  </Field>
                  <Field label="Title">
                    <input
                      value={adminForm.title}
                      onChange={e => patchAdmin('title', e.target.value)}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      placeholder="e.g. Senior Pastor"
                    />
                  </Field>
                  <Field label="Login email" required>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={e => patchAdmin('email', e.target.value)}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={adminForm.phone}
                      onChange={e => patchAdmin('phone', e.target.value)}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                    />
                  </Field>
                  <Field label="Role">
                    <input
                      value={adminForm.role}
                      disabled
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-[#8A91A0] bg-[#F8F6F3]"
                    />
                  </Field>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={!adminDirty}
                    onClick={() => {
                      setAdminForm(admin)
                      setAdminDirty(false)
                    }}
                    className="px-4 py-2.5 rounded-md text-sm border border-[#E4E0DA] text-[#5C6578] disabled:opacity-40 hover:bg-[#F8F6F3]"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={saveAdminProfile}
                    disabled={!adminDirty}
                    className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2"
                  >
                    <Check size={15} />
                    Save profile
                  </button>
                </div>
              </div>

              <div className="panel rounded-lg p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={15} className="text-accent" />
                  <h3 className="font-semibold text-ink">Change password</h3>
                </div>
                <p className="text-xs text-[#8A91A0] mb-5">
                  Demo current password starts as <span className="font-medium text-ink">demo1234</span>
                </p>

                <div className="space-y-4 max-w-md">
                  <Field label="Current password">
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="input-field w-full px-3 py-2.5 pr-10 rounded-md text-sm text-ink"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8AEB8] hover:text-[#5C6578]"
                      >
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="New password">
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field w-full px-3 py-2.5 pr-10 rounded-md text-sm text-ink"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8AEB8] hover:text-[#5C6578]"
                      >
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="input-field w-full px-3 py-2.5 rounded-md text-sm text-ink"
                      placeholder="Repeat new password"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={savePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                    className="btn-primary px-5 py-2.5 rounded-md text-sm font-medium disabled:opacity-40"
                  >
                    Update password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="panel rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold text-ink mb-4">Security preferences</h3>
              <div className="space-y-1">
                {[
                  { label: 'Two-factor authentication', desc: 'Require MFA for admin logins', on: true },
                  { label: 'Session timeout', desc: 'Auto-logout after 30 minutes idle', on: true },
                  { label: 'Audit logging', desc: 'Track admin actions with timestamps', on: true },
                  { label: 'IP restriction', desc: 'Limit access to approved networks', on: false },
                ].map(s => (
                  <ToggleRow key={s.label} label={s.label} desc={s.desc} on={s.on} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 p-1 rounded-md bg-[#EFEBE6] w-fit">
                <button
                  type="button"
                  onClick={() => setCmsSection('homepage')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    cmsSection === 'homepage' ? 'bg-white text-ink shadow-sm' : 'text-[#8A91A0]'
                  }`}
                >
                  Homepage & carousel
                </button>
                <button
                  type="button"
                  onClick={() => setCmsSection('staff')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    cmsSection === 'staff' ? 'bg-white text-ink shadow-sm' : 'text-[#8A91A0]'
                  }`}
                >
                  Staff accounts
                </button>
              </div>

              {cmsSection === 'homepage' && <HomepageCmsEditor showToast={showToast} />}

              {cmsSection === 'staff' && (
                <>
                  <div className="panel rounded-lg p-5 sm:p-6">
                    <h3 className="font-semibold text-ink mb-1">Role permissions</h3>
                    <p className="text-xs text-[#8A91A0] mb-4">
                      What each staff role can access in ChurchOS
                    </p>
                    <div className="space-y-3">
                      {Object.values(ROLE_DEFINITIONS).map((r) => (
                        <div key={r.role} className="p-4 rounded-md border border-[#E4E0DA] bg-[#F8F6F3]">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className="text-sm font-semibold text-ink">{r.label}</p>
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded"
                              style={{ background: `${r.color}18`, color: r.color }}
                            >
                              {r.pages.map((p) => p).join(' · ')}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C6578]">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isSuperAdmin ? (
                    <div className="panel rounded-lg overflow-hidden">
                      <div className="p-5 border-b border-[#E4E0DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-ink">Staff accounts</h3>
                          <p className="text-xs text-[#8A91A0] mt-0.5">
                            Create email & password credentials for sub-admins
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={openCreateStaff}
                          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium"
                        >
                          <Plus size={15} /> Add staff
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-[#F8F6F3] border-b border-[#E4E0DA]">
                              <th className="text-left text-xs font-medium text-[#8A91A0] px-5 py-3">Name</th>
                              <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Email</th>
                              <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Role</th>
                              <th className="text-right text-xs font-medium text-[#8A91A0] px-4 py-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffLoading ? (
                              <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#8A91A0]">Loading…</td>
                              </tr>
                            ) : staff.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#8A91A0]">
                                  No staff accounts yet
                                </td>
                              </tr>
                            ) : (
                              staff.map((row) => (
                                <tr key={row.id} className="border-b border-[#F0ECE7] last:border-0">
                                  <td className="px-5 py-3.5">
                                    <p className="text-sm font-medium text-ink">{row.fullName}</p>
                                    <p className="text-[11px] text-[#A8AEB8]">{row.title}</p>
                                  </td>
                                  <td className="px-4 py-3.5 text-sm text-[#5C6578]">{row.email}</td>
                                  <td className="px-4 py-3.5">
                                    <span
                                      className="text-[11px] font-medium px-2 py-0.5 rounded"
                                      style={{
                                        background: `${ROLE_DEFINITIONS[row.role as AdminRole]?.color || '#5C6578'}18`,
                                        color: ROLE_DEFINITIONS[row.role as AdminRole]?.color || '#5C6578',
                                      }}
                                    >
                                      {row.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center justify-end gap-1">
                                      {row.role !== 'Super Admin' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => openEditStaff(row)}
                                            className="p-2 text-[#8A91A0] hover:text-ink hover:bg-[#F8F6F3] rounded-md"
                                            title="Edit"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeleteStaff(row)}
                                            className="p-2 text-[#8A91A0] hover:text-danger hover:bg-[#F8EDE9] rounded-md"
                                            title="Delete"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="panel rounded-lg p-5 text-sm text-[#5C6578]">
                      Only Super Admin can create and manage staff credentials.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="panel rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold text-ink mb-4">Service schedules</h3>
              <div className="space-y-2">
                {[
                  { name: 'Sunday Morning Service', day: 'Every Sunday', time: '9:00 AM – 12:00 PM' },
                  { name: 'Wednesday Bible Study', day: 'Every Wednesday', time: '6:00 PM – 8:00 PM' },
                  { name: 'Friday Prayer Meeting', day: 'Every Friday', time: '6:30 PM – 8:30 PM' },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between p-3.5 rounded-md bg-[#F8F6F3] border border-[#E4E0DA]">
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-[#8A91A0]">{s.day} · {s.time}</p>
                    </div>
                    <span className="text-[11px] text-success font-medium">Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'biometric' && (
            <div className="panel rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold text-ink mb-4">Fingerprint devices</h3>
              <div className="space-y-2">
                {devices.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3.5 rounded-md bg-[#F8F6F3] border border-[#E4E0DA]">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${d.status === 'Online' ? 'bg-[#E8F2EC]' : 'bg-[#F8EDE9]'}`}>
                        <Fingerprint size={16} className={d.status === 'Online' ? 'text-success' : 'text-danger'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{d.id} · {d.location}</p>
                        <p className="text-xs text-[#8A91A0]">Last sync {d.lastSync}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${d.status === 'Online' ? 'text-success' : 'text-danger'}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="panel rounded-lg p-5 sm:p-6">
              <h3 className="font-semibold text-ink mb-4">Notifications</h3>
              <div className="space-y-1">
                {[
                  { label: 'Daily attendance summary', on: true },
                  { label: 'Device offline alerts', on: true },
                  { label: 'New member registered', on: true },
                  { label: 'Large transaction alerts', on: false },
                ].map(s => (
                  <ToggleRow key={s.label} label={s.label} on={s.on} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showStaffForm && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-[#E4E0DA] flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {editingStaff ? 'Edit staff account' : 'Create staff account'}
                </h3>
                <p className="text-xs text-[#8A91A0] mt-0.5">Email and password for portal login</p>
              </div>
              <button type="button" onClick={() => setShowStaffForm(false)} className="text-[#8A91A0] p-1">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <Field label="Full name" required>
                <input
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                />
              </Field>
              <Field label="Role" required>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value as typeof f.role }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                >
                  {SUB_ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </Field>
              <Field label={editingStaff ? 'New password (optional)' : 'Password'} required={!editingStaff}>
                <div className="relative">
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 pr-10 rounded-md text-sm"
                    placeholder={editingStaff ? 'Leave blank to keep current' : 'At least 6 characters'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8AEB8]"
                  >
                    {showStaffPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Phone">
                <input
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                />
              </Field>
              <p className="text-[11px] text-[#8A91A0] leading-relaxed">
                {ROLE_DEFINITIONS[staffForm.role].description}
              </p>
            </div>
            <div className="px-5 py-4 border-t border-[#E4E0DA] flex gap-2">
              <button type="button" onClick={() => setShowStaffForm(false)} className="flex-1 py-2.5 border border-[#E4E0DA] rounded-md text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={staffSaving}
                onClick={() => void saveStaff()}
                className="flex-1 btn-primary py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {staffSaving ? 'Saving…' : editingStaff ? 'Save changes' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteStaff)}
        title="Delete staff account?"
        message={
          deleteStaff
            ? `“${deleteStaff.fullName}” (${deleteStaff.role}) will no longer be able to sign in.`
            : ''
        }
        detail="Their login credentials will be permanently removed."
        confirmLabel="Delete account"
        busy={deletingStaff}
        onCancel={() => { if (!deletingStaff) setDeleteStaff(null) }}
        onConfirm={() => void confirmDeleteStaff()}
      />
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#5C6578] mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({ label, desc, on }: { label: string; desc?: string; on: boolean }) {
  const [enabled, setEnabled] = useState(on)
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F0ECE7] last:border-0">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {desc && <p className="text-xs text-[#8A91A0] mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => setEnabled(v => !v)}
        className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-[#D4CFC7]'}`}
        aria-pressed={enabled}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
            enabled ? 'right-0.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import {
  Plus, Search, Pencil, Trash2, Users, Calendar, X,
} from 'lucide-react'
import { useDepartments } from '../context/DepartmentsContext'
import { useMembers } from '../context/MembersContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { ApiError } from '../lib/api'
import { pickDepartmentStyle, type DepartmentRecord } from '../lib/departments'
import { localAvatar } from '../lib/avatars'

const emptyForm = {
  name: '',
  description: '',
  leaderName: '',
  meetingDay: '',
  meetingTime: '',
  status: 'Active' as 'Active' | 'Inactive',
}

export default function Departments() {
  const {
    departments,
    loading,
    error: loadError,
    refresh,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments()
  const { members, refresh: refreshMembers } = useMembers()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DepartmentRecord | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return departments
    return departments.filter((d) =>
      [d.name, d.leaderName, d.description, d.status].join(' ').toLowerCase().includes(q),
    )
  }, [departments, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEdit = (dept: DepartmentRecord) => {
    setEditing(dept)
    setForm({
      name: dept.name,
      description: dept.description,
      leaderName: dept.leaderName,
      meetingDay: dept.meetingDay,
      meetingTime: dept.meetingTime,
      status: dept.status === 'Inactive' ? 'Inactive' : 'Active',
    })
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  const save = async () => {
    if (!form.name.trim()) {
      setError('Department name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const style = pickDepartmentStyle(form.name.trim())
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        leaderName: form.leaderName.trim(),
        meetingDay: form.meetingDay.trim(),
        meetingTime: form.meetingTime.trim(),
        status: form.status,
        color: editing?.color || style.color,
        bg: editing?.bg || style.bg,
      }
      if (editing) await updateDepartment(editing.id, payload)
      else await createDepartment(payload)
      await refreshMembers()
      closeForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save department')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await deleteDepartment(deleteTarget.id)
      await refreshMembers()
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete department')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const displayError = error || loadError

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Departments</h2>
          <p className="text-sm text-[#8A91A0] mt-0.5">
            Ministry teams linked to members and events
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="px-4 py-2.5 border border-[#E4E0DA] text-[#5C6578] rounded-md text-sm hover:bg-[#F8F6F3]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md"
          >
            <Plus size={16} /> Add department
          </button>
        </div>
      </div>

      {displayError && (
        <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
          {displayError}
        </div>
      )}

      <div className="panel rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#E4E0DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <p className="text-sm text-[#8A91A0]">
            {filtered.length} department{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2 bg-white border border-[#E4E0DA] rounded-md px-3 py-2 w-full sm:w-auto">
            <Search size={13} className="text-[#A8AEB8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments…"
              className="bg-transparent text-sm outline-none text-ink placeholder-[#A8AEB8] w-full sm:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F6F3] border-b border-[#E4E0DA]">
                <th className="text-left text-xs font-medium text-[#8A91A0] px-5 py-3">Department</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden md:table-cell">Leader</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Members</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden lg:table-cell">Events</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3 hidden sm:table-cell">Meeting</th>
                <th className="text-left text-xs font-medium text-[#8A91A0] px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-[#8A91A0] px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#8A91A0]">
                    {loading ? 'Loading…' : 'No departments yet — add your first ministry team'}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const liveMembers = members.filter((m) => m.dept === d.name).length
                  const memberCount = Math.max(d.memberCount, liveMembers)
                  return (
                    <tr key={d.id} className="table-row-hover border-b border-[#F0ECE7] last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-sm font-semibold"
                            style={{ background: d.bg, color: d.color }}
                          >
                            {d.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{d.name}</p>
                            <p className="text-[11px] text-[#A8AEB8] truncate">{d.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {d.leaderName ? (
                          <div className="flex items-center gap-2">
                            <img src={localAvatar(d.leaderName, 40)} alt="" className="w-6 h-6 rounded-full" />
                            <span className="text-sm text-[#5C6578]">{d.leaderName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#A8AEB8]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-sm text-ink">
                          <Users size={13} className="text-accent" /> {memberCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-sm text-[#5C6578]">
                          <Calendar size={13} className="text-accent" /> {d.eventCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell text-xs text-[#5C6578]">
                        {[d.meetingDay, d.meetingTime].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            d.status === 'Active' ? 'bg-[#E8F2EC] text-success' : 'bg-[#F3F1EE] text-[#8A91A0]'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(d)}
                            className="p-2 text-[#8A91A0] hover:text-ink hover:bg-[#F8F6F3] rounded-md"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(d)}
                            className="p-2 text-[#8A91A0] hover:text-danger hover:bg-[#F8EDE9] rounded-md"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto shadow-lg">
            <div className="sticky top-0 bg-white border-b border-[#E4E0DA] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {editing ? 'Edit department' : 'Add department'}
                </h3>
                <p className="text-xs text-[#8A91A0] mt-0.5">
                  Members and events can link to this team
                </p>
              </div>
              <button type="button" onClick={closeForm} className="text-[#8A91A0] hover:text-ink p-1">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {error && (
                <div className="rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  placeholder="e.g. Choir"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Leader</label>
                <input
                  value={form.leaderName}
                  onChange={(e) => setForm((f) => ({ ...f, leaderName: e.target.value }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Meeting day</label>
                  <input
                    value={form.meetingDay}
                    onChange={(e) => setForm((f) => ({ ...f, meetingDay: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                    placeholder="Wed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Meeting time</label>
                  <input
                    value={form.meetingTime}
                    onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
                    className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                    placeholder="7:00 PM"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C6578] mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}
                  className="input-field w-full px-3 py-2.5 rounded-md text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E4E0DA] px-5 py-4 flex gap-2">
              <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-[#E4E0DA] rounded-md text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={() => void save()}
                className="flex-1 btn-primary py-2.5 text-sm font-medium rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create department'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete department?"
        message={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from the church directory.`
            : ''
        }
        detail={
          deleteTarget
            ? `${deleteTarget.memberCount} member${deleteTarget.memberCount === 1 ? '' : 's'} will move to General, and ${deleteTarget.eventCount} linked event${deleteTarget.eventCount === 1 ? '' : 's'} will be unlinked. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete department"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null) }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

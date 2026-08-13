export type DepartmentRecord = {
  id: string
  name: string
  slug: string
  description: string
  leaderName: string
  meetingDay: string
  meetingTime: string
  color: string
  bg: string
  status: string
  memberCount: number
  eventCount: number
  createdAt: string
  updatedAt: string
}

export const departmentPalette = [
  { color: '#7C3AED', bg: '#F5F3FF' },
  { color: '#1F2D4D', bg: '#F0EBE3' },
  { color: '#F59E0B', bg: '#FFFBEB' },
  { color: '#EC4899', bg: '#FDF2F8' },
  { color: '#059669', bg: '#ECFDF5' },
  { color: '#DB2777', bg: '#FDF2F8' },
  { color: '#0891B2', bg: '#ECFEFF' },
  { color: '#92400E', bg: '#FFFBEB' },
  { color: '#9A7B4F', bg: '#F5F0E8' },
  { color: '#2F6B4F', bg: '#E8F2EC' },
]

export function slugifyDepartment(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'department'
}

export function pickDepartmentStyle(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return departmentPalette[Math.abs(h) % departmentPalette.length]
}

import { prisma } from '@/lib/server/prisma'
import { formatMemberDate } from '@/lib/members'

export type DbMember = {
  id: string
  memberCode: string
  fullName: string
  gender: string
  dob: Date
  phone: string
  address: string
  teachingClass: string
  department: string
  baptized: boolean
  dateJoined: Date
  occupation: string
  maritalStatus: string
  emergencyContact: string
  email: string
  status: string
  avatarUrl: string | null
  fingerprintEnrolled: boolean
  fingerprintCredentialId?: string | null
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function serializeMember(m: DbMember & { fingerprintCredentialId?: string | null }) {
  const dateJoined = toIsoDate(m.dateJoined)
  return {
    id: m.memberCode,
    dbId: m.id,
    name: m.fullName,
    gender: m.gender,
    dob: toIsoDate(m.dob),
    phone: m.phone,
    address: m.address,
    teachingClass: m.teachingClass,
    dept: m.department,
    baptized: m.baptized,
    dateJoined,
    occupation: m.occupation,
    maritalStatus: m.maritalStatus,
    emergencyContact: m.emergencyContact,
    status: (m.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
    avatar: m.avatarUrl || '',
    fingerprintEnrolled: m.fingerprintEnrolled,
    fingerprintCredentialId: m.fingerprintCredentialId || null,
    joined: formatMemberDate(dateJoined),
    email: m.email || '',
  }
}

export function normalizeMemberCode(raw: string) {
  return raw.trim().replace(/\s+/g, '-')
}

export function isValidMemberCode(code: string) {
  return code.length >= 2 && code.length <= 40
}

export async function findMemberByCodeOrId(codeOrId: string) {
  return prisma.member.findFirst({
    where: { OR: [{ memberCode: codeOrId }, { id: codeOrId }] },
  })
}

export async function memberCodeTaken(code: string, excludeDbId?: string) {
  const existing = await prisma.member.findFirst({
    where: { memberCode: { equals: code, mode: 'insensitive' } },
  })
  if (!existing) return null
  if (excludeDbId && existing.id === excludeDbId) return null
  return existing
}

export async function nextMemberCode() {
  const rows = await prisma.member.findMany({ select: { memberCode: true } })
  const nums = rows.map((r) => Number(r.memberCode.replace(/\D/g, ''))).filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 1000) + 1
  return `GC-${String(next).padStart(6, '0')}`
}

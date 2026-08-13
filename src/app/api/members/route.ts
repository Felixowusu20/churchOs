import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json } from '@/lib/server/http'
import {
  isValidMemberCode,
  memberCodeTaken,
  nextMemberCode,
  normalizeMemberCode,
  serializeMember,
} from '@/lib/server/members'
import { resolveDepartmentLink } from '@/lib/server/departments'
import { localAvatar } from '@/lib/avatars'
import { normalizePhone, phonesMatch } from '@/lib/phone'

export async function GET(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const dept = req.nextUrl.searchParams.get('dept') || ''

  const members = await prisma.member.findMany({
    where: {
      ...(dept && dept !== 'All' ? { department: dept } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { memberCode: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { teachingClass: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return json({ members: members.map(serializeMember), nextId: await nextMemberCode() })
}

const createSchema = z.object({
  name: z.string().min(2),
  gender: z.string().min(1),
  dob: z.string().min(1),
  phone: z.string().min(3),
  address: z.string().min(2),
  teachingClass: z.string().min(1),
  dept: z.string().min(1),
  baptized: z.boolean(),
  dateJoined: z.string().min(1),
  occupation: z.string().min(1),
  maritalStatus: z.string().min(1),
  emergencyContact: z.string().min(2),
  email: z.string().optional(),
  avatar: z.string().optional(),
  id: z.string().optional(),
  memberCode: z.string().optional(),
  fingerprintEnrolled: z.boolean().optional(),
  fingerprintCredentialId: z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Invalid member data', 400, parsed.error.flatten())

  const data = parsed.data
  const dob = new Date(`${data.dob}T12:00:00`)
  const dateJoined = new Date(`${data.dateJoined}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return error('Invalid date of birth')
  if (Number.isNaN(dateJoined.getTime())) return error('Invalid date joined')

  if (data.fingerprintCredentialId) {
    const taken = await prisma.member.findUnique({
      where: { fingerprintCredentialId: data.fingerprintCredentialId },
    })
    if (taken) {
      return error(
        `${taken.fullName} (${taken.memberCode}) is already registered with this Face ID on this device.`,
        409,
        { code: 'ALREADY_REGISTERED', memberCode: taken.memberCode, name: taken.fullName },
      )
    }
  }

  const phoneNorm = normalizePhone(data.phone)
  if (phoneNorm.length >= 7) {
    const phoneCandidates = await prisma.member.findMany({
      where: { status: 'Active' },
      select: { memberCode: true, fullName: true, phone: true },
      take: 5000,
    })
    const phoneTaken = phoneCandidates.find((m) => phonesMatch(m.phone, data.phone))
    if (phoneTaken) {
      return error(
        `${phoneTaken.fullName} (${phoneTaken.memberCode}) is already registered with this phone number.`,
        409,
        { code: 'ALREADY_REGISTERED', memberCode: phoneTaken.memberCode, name: phoneTaken.fullName },
      )
    }
  }

  const requestedCode = normalizeMemberCode(data.memberCode || data.id || '')
  let memberCode = requestedCode
  if (requestedCode) {
    if (!isValidMemberCode(requestedCode)) {
      return error('Member ID must be between 2 and 40 characters')
    }
    const taken = await memberCodeTaken(requestedCode)
    if (taken) {
      return error(
        `${taken.fullName} (${taken.memberCode}) is already using this member ID.`,
        409,
        { code: 'ID_TAKEN', memberCode: taken.memberCode, name: taken.fullName },
      )
    }
  } else {
    memberCode = await nextMemberCode()
  }
  const fullName = data.name.trim()
  const avatarUrl = data.avatar?.startsWith('http') || data.avatar?.startsWith('data:')
    ? data.avatar
    : localAvatar(fullName)

  const deptLink = await resolveDepartmentLink(data.dept)
  const hasFp = Boolean(data.fingerprintCredentialId) || Boolean(data.fingerprintEnrolled)

  const member = await prisma.member.create({
    data: {
      memberCode,
      fullName,
      gender: data.gender,
      dob,
      phone: data.phone.trim(),
      address: data.address.trim(),
      teachingClass: data.teachingClass,
      department: deptLink.department,
      departmentId: deptLink.departmentId,
      baptized: data.baptized,
      dateJoined,
      occupation: data.occupation.trim(),
      maritalStatus: data.maritalStatus,
      emergencyContact: data.emergencyContact.trim(),
      email: (data.email || '').trim(),
      status: 'Active',
      avatarUrl,
      fingerprintEnrolled: hasFp,
      fingerprintCredentialId: data.fingerprintCredentialId || null,
      createdById: adminId,
    },
  })

  return json({ member: serializeMember(member) }, 201)
}

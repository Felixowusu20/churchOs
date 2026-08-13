import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { requireAdminId } from '@/lib/server/auth'
import { error, json } from '@/lib/server/http'
import {
  findMemberByCodeOrId,
  isValidMemberCode,
  memberCodeTaken,
  normalizeMemberCode,
  serializeMember,
} from '@/lib/server/members'
import { resolveDepartmentLink } from '@/lib/server/departments'
import { localAvatar } from '@/lib/avatars'
import { normalizePhone, phonesMatch } from '@/lib/phone'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { code } = await params

  const member = await findMemberByCodeOrId(code)
  if (!member) return error('Member not found', 404)
  return json({ member: serializeMember(member) })
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  gender: z.string().min(1).optional(),
  dob: z.string().min(1).optional(),
  phone: z.string().min(3).optional(),
  address: z.string().min(2).optional(),
  teachingClass: z.string().min(1).optional(),
  dept: z.string().min(1).optional(),
  baptized: z.boolean().optional(),
  dateJoined: z.string().min(1).optional(),
  occupation: z.string().min(1).optional(),
  maritalStatus: z.string().min(1).optional(),
  emergencyContact: z.string().min(2).optional(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  id: z.string().optional(),
  memberCode: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { code } = await params

  const current = await findMemberByCodeOrId(code)
  if (!current) return error('Member not found', 404)

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return error('Invalid member data', 400, parsed.error.flatten())

  const data = parsed.data
  const requestedCode = normalizeMemberCode(data.memberCode || data.id || '')
  let nextCode = current.memberCode
  if (requestedCode && requestedCode.toLowerCase() !== current.memberCode.toLowerCase()) {
    if (!isValidMemberCode(requestedCode)) {
      return error('Member ID must be between 2 and 40 characters')
    }
    const taken = await memberCodeTaken(requestedCode, current.id)
    if (taken) {
      return error(
        `${taken.fullName} (${taken.memberCode}) is already using this member ID.`,
        409,
      )
    }
    nextCode = requestedCode
  }

  let dob = current.dob
  if (data.dob) {
    dob = new Date(`${data.dob}T12:00:00`)
    if (Number.isNaN(dob.getTime())) return error('Invalid date of birth')
  }
  let dateJoined = current.dateJoined
  if (data.dateJoined) {
    dateJoined = new Date(`${data.dateJoined}T12:00:00`)
    if (Number.isNaN(dateJoined.getTime())) return error('Invalid date joined')
  }

  if (data.phone) {
    const phoneNorm = normalizePhone(data.phone)
    if (phoneNorm.length >= 7) {
      const phoneCandidates = await prisma.member.findMany({
        where: { status: 'Active', NOT: { id: current.id } },
        select: { memberCode: true, fullName: true, phone: true },
        take: 5000,
      })
      const phoneTaken = phoneCandidates.find((m) => phonesMatch(m.phone, data.phone!))
      if (phoneTaken) {
        return error(
          `${phoneTaken.fullName} (${phoneTaken.memberCode}) is already registered with this phone number.`,
          409,
        )
      }
    }
  }

  const fullName = data.name?.trim() || current.fullName
  let avatarUrl = current.avatarUrl
  if (data.avatar !== undefined) {
    avatarUrl =
      data.avatar.startsWith('http') || data.avatar.startsWith('data:')
        ? data.avatar
        : localAvatar(fullName)
  }

  const deptLink = data.dept ? await resolveDepartmentLink(data.dept) : null

  const member = await prisma.$transaction(async (tx) => {
    if (nextCode !== current.memberCode) {
      await tx.eventCheckIn.updateMany({
        where: { memberCode: current.memberCode },
        data: { memberCode: nextCode, memberName: fullName },
      })
    } else if (data.name && fullName !== current.fullName) {
      await tx.eventCheckIn.updateMany({
        where: { memberCode: current.memberCode },
        data: { memberName: fullName },
      })
    }

    return tx.member.update({
      where: { id: current.id },
      data: {
        memberCode: nextCode,
        fullName,
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        dob,
        ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
        ...(data.address !== undefined ? { address: data.address.trim() } : {}),
        ...(data.teachingClass !== undefined ? { teachingClass: data.teachingClass } : {}),
        ...(deptLink
          ? { department: deptLink.department, departmentId: deptLink.departmentId }
          : {}),
        ...(data.baptized !== undefined ? { baptized: data.baptized } : {}),
        dateJoined,
        ...(data.occupation !== undefined ? { occupation: data.occupation.trim() } : {}),
        ...(data.maritalStatus !== undefined ? { maritalStatus: data.maritalStatus } : {}),
        ...(data.emergencyContact !== undefined
          ? { emergencyContact: data.emergencyContact.trim() }
          : {}),
        ...(data.email !== undefined ? { email: data.email.trim() } : {}),
        ...(data.avatar !== undefined ? { avatarUrl } : {}),
      },
    })
  })

  return json({ member: serializeMember(member) })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)
  const { code } = await params

  try {
    await prisma.member.deleteMany({
      where: {
        OR: [{ memberCode: code }, { id: code }],
      },
    })
    return json({ ok: true })
  } catch {
    return error('Member not found', 404)
  }
}

import { prisma } from '@/lib/server/prisma'
import { pickDepartmentStyle, slugifyDepartment, type DepartmentRecord } from '@/lib/departments'

type DeptRow = {
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
  createdAt: Date
  updatedAt: Date
  _count?: { members: number; events: number }
}

export function serializeDepartment(row: DeptRow): DepartmentRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    leaderName: row.leaderName,
    meetingDay: row.meetingDay,
    meetingTime: row.meetingTime,
    color: row.color,
    bg: row.bg,
    status: row.status,
    memberCount: row._count?.members ?? 0,
    eventCount: row._count?.events ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listDepartments() {
  const rows = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { members: true, events: true } } },
  })
  return rows.map(serializeDepartment)
}

export async function resolveDepartmentLink(departmentName: string) {
  const name = departmentName.trim()
  if (!name) return { department: 'General', departmentId: null as string | null }

  const existing = await prisma.department.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return { department: existing.name, departmentId: existing.id }

  const style = pickDepartmentStyle(name)
  let slug = slugifyDepartment(name)
  const slugTaken = await prisma.department.findUnique({ where: { slug } })
  if (slugTaken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const created = await prisma.department.create({
    data: {
      name,
      slug,
      color: style.color,
      bg: style.bg,
      status: 'Active',
    },
  })
  return { department: created.name, departmentId: created.id }
}

export async function uniqueDepartmentSlug(base: string, excludeId?: string) {
  let slug = slugifyDepartment(base)
  let i = 0
  while (true) {
    const candidate = i === 0 ? slug : `${slug}-${i}`
    const found = await prisma.department.findUnique({ where: { slug: candidate } })
    if (!found || found.id === excludeId) return candidate
    i += 1
  }
}

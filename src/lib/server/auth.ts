import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { env } from './env'
import { prisma } from './prisma'
import { canManageStaff, normalizeRole, type AdminRole } from '@/lib/roles'
import { error } from './http'

export type AdminTokenPayload = {
  sub: string
  email: string
  role: string
}

export type AuthAdmin = {
  id: string
  email: string
  fullName: string
  title: string
  phone: string
  role: string
  avatarUrl: string | null
  createdAt: Date
  passwordHash: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signAdminToken(payload: AdminTokenPayload) {
  return jwt.sign(payload, env.adminJwtSecret, { expiresIn: '7d' })
}

export function verifyAdminToken(token: string) {
  return jwt.verify(token, env.adminJwtSecret) as AdminTokenPayload
}

export function publicAdmin(admin: {
  id: string
  email: string
  fullName: string
  title: string
  phone: string
  role: string
  avatarUrl: string | null
  createdAt: Date
}) {
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    title: admin.title,
    phone: admin.phone,
    role: normalizeRole(admin.role),
    avatarUrl: admin.avatarUrl,
    createdAt: admin.createdAt,
  }
}

export async function getAdminFromRequest(req: NextRequest): Promise<AuthAdmin | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  try {
    const payload = verifyAdminToken(header.slice(7))
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } })
    return admin
  } catch {
    return null
  }
}

export async function getAdminIdFromRequest(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  return admin?.id ?? null
}

export async function requireAdminId(req: NextRequest) {
  return getAdminIdFromRequest(req)
}

export async function requireAdmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return { admin: null as AuthAdmin | null, response: error('Unauthorized', 401) }
  return { admin, response: null }
}

export async function requireSuperAdmin(req: NextRequest) {
  const { admin, response } = await requireAdmin(req)
  if (response) return { admin: null as AuthAdmin | null, response }
  if (!canManageStaff(admin!.role)) {
    return { admin: null as AuthAdmin | null, response: error('Only Super Admin can manage staff accounts', 403) }
  }
  return { admin: admin!, response: null }
}

export function assertRole(admin: AuthAdmin, allowed: AdminRole[]) {
  const role = normalizeRole(admin.role)
  return allowed.includes(role)
}

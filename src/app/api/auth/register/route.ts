import { z } from 'zod'
import { prisma, withDbRetry } from '@/lib/server/prisma'
import { env } from '@/lib/server/env'
import { hashPassword, signAdminToken, publicAdmin } from '@/lib/server/auth'
import { error, json, prismaError } from '@/lib/server/http'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  title: z.string().optional(),
  phone: z.string().optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return error('Invalid registration data', 400, parsed.error.flatten())
  }

  try {
    const adminCount = await withDbRetry(() => prisma.admin.count())
    if (adminCount > 0) {
      return error('Admin account already exists. Registration is closed.', 403)
    }
    if (!env.openRegistration) {
      return error('Admin registration is disabled.', 403)
    }

    const email = parsed.data.email.trim().toLowerCase()
    const existing = await withDbRetry(() => prisma.admin.findUnique({ where: { email } }))
    if (existing) {
      return error('An account with this email already exists.', 409)
    }

    const passwordHash = await hashPassword(parsed.data.password)
    const admin = await withDbRetry(() =>
      prisma.admin.create({
        data: {
          email,
          passwordHash,
          fullName: parsed.data.fullName.trim(),
          title: parsed.data.title?.trim() || 'Administrator',
          phone: parsed.data.phone?.trim() || '',
          role: 'Super Admin',
        },
      }),
    )

    const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role })
    return json({ token, admin: publicAdmin(admin) }, 201)
  } catch (err) {
    return prismaError(err)
  }
}

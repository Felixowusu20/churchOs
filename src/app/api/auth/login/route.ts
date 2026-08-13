import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { verifyPassword, signAdminToken, publicAdmin } from '@/lib/server/auth'
import { error, json } from '@/lib/server/http'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return error('Invalid login data')

  const email = parsed.data.email.trim().toLowerCase()
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin) return error('Invalid email or password', 401)

  const ok = await verifyPassword(parsed.data.password, admin.passwordHash)
  if (!ok) return error('Invalid email or password', 401)

  const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role })
  return json({ token, admin: publicAdmin(admin) })
}

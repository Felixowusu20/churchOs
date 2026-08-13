import { NextRequest } from 'next/server'
import { FinanceKind } from '@prisma/client'
import { requireAdminId } from '@/lib/server/auth'
import { listFinanceEntries } from '@/lib/server/finance'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const adminId = await requireAdminId(req)
  if (!adminId) return error('Unauthorized', 401)

  try {
    const kindRaw = req.nextUrl.searchParams.get('kind')?.toUpperCase()
    const kind = kindRaw === 'INCOME' || kindRaw === 'EXPENSE' ? (kindRaw as FinanceKind) : undefined
    const category = req.nextUrl.searchParams.get('category') || undefined
    const q = req.nextUrl.searchParams.get('q') || undefined

    const entries = await listFinanceEntries({ kind, category, q })
    return json({ entries })
  } catch (err) {
    return prismaError(err)
  }
}

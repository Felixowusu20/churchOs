import { NextRequest } from 'next/server'
import { getAdminFromRequest } from '@/lib/server/auth'
import { getFinanceSummary } from '@/lib/server/finance'
import { normalizeRole } from '@/lib/roles'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return error('Unauthorized', 401)

  const role = normalizeRole(admin.role)
  // Finance Minister may log money but cannot view dashboard totals.
  // Organizer has no finance access. Secretary needs summary for Reports.
  if (role === 'Finance Minister') {
    return error('Finance dashboard is restricted for Finance Minister accounts.', 403)
  }
  if (role === 'Organizer') return error('Forbidden', 403)

  try {
    const summary = await getFinanceSummary()
    return json(summary)
  } catch (err) {
    return prismaError(err)
  }
}

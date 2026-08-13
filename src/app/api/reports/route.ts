import { NextRequest } from 'next/server'
import { getAdminFromRequest } from '@/lib/server/auth'
import { canAccessPage } from '@/lib/roles'
import { getReportBundle, resolveReportRange } from '@/lib/server/reports'
import { error, json, prismaError } from '@/lib/server/http'

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return error('Unauthorized', 401)
  if (!canAccessPage(admin.role, 'reports')) {
    return error('Reports are not available for this role', 403)
  }

  try {
    const start = req.nextUrl.searchParams.get('start')
    const end = req.nextUrl.searchParams.get('end')
    const range = resolveReportRange(start, end)
    const report = await getReportBundle(range)
    return json(report)
  } catch (err) {
    return prismaError(err)
  }
}

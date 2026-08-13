import { NextRequest } from 'next/server'
import { requireSuperAdmin } from '@/lib/server/auth'
import { getHomepageContent, saveHomepageContent } from '@/lib/server/site'
import { normalizeHomepageContent } from '@/lib/homepage'
import { error, json, prismaError } from '@/lib/server/http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStore = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/** Public — landing page loads CMS content without auth. */
export async function GET() {
  try {
    const content = await getHomepageContent()
    return json({ content }, 200, noStore)
  } catch (err) {
    return prismaError(err)
  }
}

/** Super Admin — update homepage CMS. */
export async function PUT(req: NextRequest) {
  const { response } = await requireSuperAdmin(req)
  if (response) return response

  const body = await req.json().catch(() => null)
  if (!body?.content) return error('Missing homepage content', 400)

  try {
    const content = await saveHomepageContent(normalizeHomepageContent(body.content))
    return json({ content })
  } catch (err) {
    return prismaError(err)
  }
}

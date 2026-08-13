import { prisma } from '@/lib/server/prisma'
import {
  defaultHomepageContent,
  normalizeHomepageContent,
  type HomepageContent,
} from '@/lib/homepage'

export const HOMEPAGE_KEY = 'homepage'

export async function getHomepageContent(): Promise<HomepageContent> {
  return ensureHomepageSeeded()
}

export async function saveHomepageContent(content: HomepageContent): Promise<HomepageContent> {
  const normalized = normalizeHomepageContent(content)
  const row = await prisma.siteContent.upsert({
    where: { key: HOMEPAGE_KEY },
    create: { key: HOMEPAGE_KEY, content: normalized },
    update: { content: normalized },
  })
  return normalizeHomepageContent(row.content)
}

export async function ensureHomepageSeeded() {
  const existing = await prisma.siteContent.findUnique({ where: { key: HOMEPAGE_KEY } })
  if (existing) return normalizeHomepageContent(existing.content)
  const content = defaultHomepageContent()
  await prisma.siteContent.create({ data: { key: HOMEPAGE_KEY, content } })
  return content
}

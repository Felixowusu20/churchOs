#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'
import { defaultHomepageContent } from '../src/lib/homepage'

async function main() {
  const prisma = new PrismaClient()
  try {
    const content = defaultHomepageContent()
    await prisma.siteContent.upsert({
      where: { key: 'homepage' },
      create: { key: 'homepage', content },
      update: {},
    })
    const row = await prisma.siteContent.findUniqueOrThrow({ where: { key: 'homepage' } })
    const c = row.content as ReturnType<typeof defaultHomepageContent>
    console.log(
      `Homepage CMS ready · ${c.hero.slides.length} carousel slides · ${c.features.items.length} features · ${c.pricing.plans.length} plans`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

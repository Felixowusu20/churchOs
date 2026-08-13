import { prisma } from '@/lib/server/prisma'
import { json } from '@/lib/server/http'

export async function GET() {
  const events = await prisma.churchEvent.findMany({
    where: {
      biometric: true,
      status: { not: 'Completed' },
    },
    orderBy: { createdAt: 'asc' },
  })
  return json({ events })
}

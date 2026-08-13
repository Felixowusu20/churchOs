import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers })
}

export function error(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, { status })
}

export function prismaError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001') {
    return error(
      'Database is waking up or unreachable. Wait a few seconds and try again. If this keeps happening, check your Neon project is active and DATABASE_URL uses the -pooler host.',
      503,
    )
  }
  console.error(err)
  return error('Unexpected server error', 500)
}

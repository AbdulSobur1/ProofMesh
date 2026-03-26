export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { SESSION_COOKIE } from '@/lib/auth'
import { verifySessionToken } from '@/lib/services/session'

export async function GET(request: Request) {
  const token = await getCurrentToken(request)

  if (token?.sub) {
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
    })

    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
        },
      })
    }
  }

  const cookieStore = await cookies()
  const legacyToken = cookieStore.get(SESSION_COOKIE)?.value
  const legacySession = legacyToken ? verifySessionToken(legacyToken) : null

  if (!legacySession) {
    return NextResponse.json({ user: null })
  }

  const legacyUser = await prisma.user.findUnique({
    where: { username: legacySession.username },
  })

  if (!legacyUser) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: legacyUser.id,
      username: legacyUser.username,
      createdAt: legacyUser.createdAt.toISOString(),
    },
  })
}


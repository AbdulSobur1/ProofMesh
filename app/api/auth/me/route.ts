export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { SESSION_COOKIE } from '@/lib/auth'
import { verifySessionToken } from '@/lib/services/session'
import { isAdminUsername } from '@/lib/services/admin'
import { syncUserTrustLevel } from '@/lib/services/trust-server'

export async function GET(request: Request) {
  const toSessionUser = (user: {
    id: string
    username: string
    trustLevel: string
    identityVerifiedAt: Date | null
    displayName: string | null
    headline: string | null
    location: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
    walletAddress?: string | null
    createdAt: Date
  }) => ({
    id: user.id,
    username: user.username,
    trustLevel: user.trustLevel,
    identityVerifiedAt: user.identityVerifiedAt?.toISOString() ?? null,
    displayName: user.displayName,
    headline: user.headline,
    location: user.location,
    avatarUrl: user.avatarUrl,
    currentRole: user.currentRole,
    currentCompany: user.currentCompany,
    walletAddress: user.walletAddress ?? null,
    createdAt: user.createdAt.toISOString(),
    isAdmin: isAdminUsername(user.username),
    email: user.username,
  })

  const token = await getCurrentToken(request)

  if (token?.sub) {
    const user = await syncUserTrustLevel(token.sub)

    if (user) {
      return NextResponse.json({
        user: toSessionUser(user),
      })
    }
  }

  const cookieStore = await cookies()
  const legacyToken = cookieStore.get(SESSION_COOKIE)?.value
  const legacySession = legacyToken ? verifySessionToken(legacyToken) : null

  if (!legacySession) {
    return NextResponse.json({ user: null })
  }

  const legacyUserRecord = await prisma.user.findUnique({
    where: { username: legacySession.username },
    select: { id: true },
  })

  const legacyUser = legacyUserRecord ? await syncUserTrustLevel(legacyUserRecord.id) : null

  if (!legacyUser) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: toSessionUser(legacyUser),
  })
}



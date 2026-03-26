import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifySessionToken } from '@/lib/services/session'

export const SESSION_COOKIE = 'proofmesh_session'

export const getCurrentUsername = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = verifySessionToken(token)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { username: session.username },
    select: { username: true },
  })

  return user?.username ?? null
}

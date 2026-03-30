import { prisma } from '@/lib/db'
import { deriveTrustLevel } from '@/lib/services/trust'

const trustUserSelect = {
  id: true,
  username: true,
  trustLevel: true,
  identityVerifiedAt: true,
  displayName: true,
  headline: true,
  bio: true,
  location: true,
  websiteUrl: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
  yearsExperience: true,
  createdAt: true,
} as const

export const syncUserTrustLevel = async (userId: string) => {
  const [user, proofCount, acceptedConnectionCount, endorsementCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: trustUserSelect,
    }),
    prisma.proof.count({
      where: { userId },
    }),
    prisma.connection.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
    }),
    prisma.proofEndorsement.count({
      where: {
        proof: {
          userId,
        },
      },
    }),
  ])

  if (!user) {
    return null
  }

  const nextTrustLevel = deriveTrustLevel({
    identityVerifiedAt: user.identityVerifiedAt,
    proofCount,
    acceptedConnectionCount,
    endorsementCount,
  })

  if (user.trustLevel === nextTrustLevel) {
    return user
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      trustLevel: nextTrustLevel,
    },
    select: trustUserSelect,
  })
}

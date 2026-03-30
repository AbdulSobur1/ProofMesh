import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { PeerVerification, Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { emptyNetworkCounts, resolveProfileConnectionState } from '@/lib/services/network'
import { getCurrentToken } from '@/lib/auth-options'

const recentViewerSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

const toEndorsement = (endorsement: {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  relationship: endorsement.relationship as PeerVerification['relationship'],
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: unknown
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  verifiedAt: Date | null
  createdAt: Date
  endorsements?: Array<{
    id: string
    verifierName: string
    verifierRole: string | null
    verifierCompany: string | null
    relationship: string
    message: string
    createdAt: Date
  }>
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  profession: proof.profession,
  proofType: proof.proofType,
  outcomeSummary: proof.outcomeSummary,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(typeof proof.tags === 'string' ? proof.tags : null),
  txHash: proof.txHash,
  verificationStatus: proof.verificationStatus,
  verificationConfidence: proof.verificationConfidence,
  verificationSignals: parseVerificationSignals(proof.verificationSignals),
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: (proof.endorsements ?? []).map(toEndorsement),
  endorsementCount: proof.endorsements?.length ?? 0,
  createdAt: proof.createdAt.toISOString(),
})

const toWorkExperience = (entry: {
  id: string
  title: string
  company: string
  location: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
}) => ({
  id: entry.id,
  title: entry.title,
  company: entry.company,
  location: entry.location,
  startDate: entry.startDate,
  endDate: entry.endDate,
  isCurrent: entry.isCurrent,
  description: entry.description,
})

const toEducation = (entry: {
  id: string
  school: string
  degree: string
  fieldOfStudy: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
}) => ({
  id: entry.id,
  school: entry.school,
  degree: entry.degree,
  fieldOfStudy: entry.fieldOfStudy,
  startDate: entry.startDate,
  endDate: entry.endDate,
  description: entry.description,
})

const toCertification = (entry: {
  id: string
  name: string
  issuer: string
  issueDate: string | null
  credentialUrl: string | null
}) => ({
  id: entry.id,
  name: entry.name,
  issuer: entry.issuer,
  issueDate: entry.issueDate,
  credentialUrl: entry.credentialUrl,
})

const toClaimedSkill = (entry: {
  id: string
  name: string
}) => ({
  id: entry.id,
  name: entry.name,
})

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  const username = decodeURIComponent(params.username)
  const token = await getCurrentToken(request)
  const viewerUserId = token?.sub ?? null

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      workExperiences: {
        orderBy: { displayOrder: 'asc' },
      },
      educations: {
        orderBy: { displayOrder: 'asc' },
      },
      certifications: {
        orderBy: { displayOrder: 'asc' },
      },
      claimedSkills: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  })

  if (!user) {
    return NextResponse.json({
      user: null,
    proofs: [],
    reputation: {
        averageScore: 0,
        totalProofs: 0,
        tagFrequency: [],
        verifiedProofs: 0,
        averageConfidence: 0,
      endorsementCount: 0,
    },
    workExperiences: [],
    educations: [],
    certifications: [],
    claimedSkills: [],
    provenSkills: [],
    networkCounts: emptyNetworkCounts,
    viewerConnection: {
      status: 'none',
      connectionId: null,
    },
    profileAnalytics: {
      totalViews: 0,
      uniqueViewers: 0,
      recentViewers: [],
    },
    })
  }

  if (viewerUserId && viewerUserId !== user.id) {
    await prisma.profileView.upsert({
      where: {
        profileUserId_viewerUserId: {
          profileUserId: user.id,
          viewerUserId,
        },
      },
      create: {
        profileUserId: user.id,
        viewerUserId,
      },
      update: {
        lastViewedAt: new Date(),
        viewCount: {
          increment: 1,
        },
      },
    })
  }

  const proofs = await prisma.proof.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      endorsements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const profileViews = viewerUserId === user.id
    ? await prisma.profileView.findMany({
        where: {
          profileUserId: user.id,
        },
        include: {
          viewerUser: {
            select: recentViewerSelect,
          },
        },
        orderBy: { lastViewedAt: 'desc' },
        take: 8,
      })
    : []

  const proofDtos = proofs.map(toProof)
  const reputation = calculateReputation(proofDtos)
  const [acceptedCount, incomingPendingCount, outgoingPendingCount, viewerConnection] = await Promise.all([
    prisma.connection.count({
      where: {
        status: 'accepted',
        OR: [{ requesterId: user.id }, { recipientId: user.id }],
      },
    }),
    prisma.connection.count({
      where: {
        recipientId: user.id,
        status: 'pending',
      },
    }),
    prisma.connection.count({
      where: {
        requesterId: user.id,
        status: 'pending',
      },
    }),
    viewerUserId && viewerUserId !== user.id
      ? prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: viewerUserId, recipientId: user.id },
              { requesterId: user.id, recipientId: viewerUserId },
            ],
          },
          select: {
            id: true,
            status: true,
            requesterId: true,
            recipientId: true,
          },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      headline: user.headline,
      bio: user.bio,
      location: user.location,
      websiteUrl: user.websiteUrl,
      avatarUrl: user.avatarUrl,
      currentRole: user.currentRole,
      currentCompany: user.currentCompany,
      yearsExperience: user.yearsExperience,
      createdAt: user.createdAt.toISOString(),
    },
    proofs: proofDtos,
    reputation,
    workExperiences: user.workExperiences.map(toWorkExperience),
    educations: user.educations.map(toEducation),
    certifications: user.certifications.map(toCertification),
    claimedSkills: user.claimedSkills.map(toClaimedSkill),
    provenSkills: reputation.tagFrequency,
    networkCounts: {
      totalConnections: acceptedCount,
      incomingRequests: incomingPendingCount,
      outgoingRequests: outgoingPendingCount,
    },
    viewerConnection: resolveProfileConnectionState(viewerUserId, user.id, viewerConnection),
    profileAnalytics: {
      totalViews: profileViews.reduce((sum, entry) => sum + entry.viewCount, 0),
      uniqueViewers: profileViews.length,
      recentViewers: profileViews.map((entry) => entry.viewerUser),
    },
  })
}

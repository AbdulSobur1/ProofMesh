import { NextResponse } from 'next/server'
import { calculateReputation } from '@/lib/services/reputation'
import { prisma } from '@/lib/db'
import { PeerVerification, Proof, ProofEndorsementRequest } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { syncUserTrustLevel } from '@/lib/services/trust-server'
import { parseEvidenceItems } from '@/lib/services/evidence'
import { getCurrentToken } from '@/lib/auth-options'

const requestUserSelect = {
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
  verifiedReviewer: boolean
  reviewerTrustLevel: string
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  verifiedReviewer: endorsement.verifiedReviewer,
  reviewerTrustLevel: endorsement.reviewerTrustLevel,
  relationship: endorsement.relationship as PeerVerification['relationship'],
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  sourceCategory: string
  artifactSummary: string | null
  evidenceItems: string
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
  riskScore: number
  riskFlags: string
  moderationStatus: string
  verifiedAt: Date | null
  createdAt: Date
  endorsements?: Array<{
    id: string
    verifierName: string
    verifierRole: string | null
    verifierCompany: string | null
    verifiedReviewer: boolean
    reviewerTrustLevel: string
    relationship: string
    message: string
    createdAt: Date
  }>
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  sourceCategory: proof.sourceCategory as Proof['sourceCategory'],
  artifactSummary: proof.artifactSummary,
  evidenceItems: parseEvidenceItems(proof.evidenceItems),
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
  riskScore: proof.riskScore,
  riskFlags: parseTags(proof.riskFlags),
  moderationStatus: proof.moderationStatus as Proof['moderationStatus'],
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: (proof.endorsements ?? []).map(toEndorsement),
  endorsementCount: proof.endorsements?.length ?? 0,
  createdAt: proof.createdAt.toISOString(),
})

const toEndorsementRequest = (request: {
  id: string
  relationship: string
  message: string | null
  status: string
  createdAt: Date
  respondedAt: Date | null
  requester: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
  recipient: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
}): ProofEndorsementRequest => ({
  id: request.id,
  relationship: request.relationship as ProofEndorsementRequest['relationship'],
  message: request.message,
  status: request.status as ProofEndorsementRequest['status'],
  createdAt: request.createdAt.toISOString(),
  respondedAt: request.respondedAt?.toISOString() ?? null,
  requester: request.requester,
  recipient: request.recipient,
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proofId: string }> }
) {
  const { proofId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub ?? null

  const proof = await prisma.proof.findUnique({
    where: { id: proofId },
    include: {
      endorsements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!proof) {
    return NextResponse.json({ proof: null, user: null, reputation: null }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: proof.userId },
  })

  if (!user) {
    return NextResponse.json({ proof: null, user: null, reputation: null }, { status: 404 })
  }

  const syncedUser = await syncUserTrustLevel(user.id)
  const owner = {
    ...user,
    ...syncedUser,
  }

  const ownerProofs = await prisma.proof.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      endorsements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const endorsementRequests = await prisma.proofEndorsementRequest.findMany({
    where: {
      proofId: proof.id,
    },
    include: {
      requester: {
        select: requestUserSelect,
      },
      recipient: {
        select: requestUserSelect,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const requestDtos = endorsementRequests.map(toEndorsementRequest)

  return NextResponse.json({
    proof: toProof(proof),
    user: {
      id: user.id,
      username: owner.username,
      trustLevel: owner.trustLevel,
      identityVerifiedAt: owner.identityVerifiedAt?.toISOString() ?? null,
      displayName: owner.displayName,
      headline: owner.headline,
      bio: owner.bio,
      location: owner.location,
      websiteUrl: owner.websiteUrl,
      avatarUrl: owner.avatarUrl,
      currentRole: owner.currentRole,
      currentCompany: owner.currentCompany,
      yearsExperience: owner.yearsExperience,
      createdAt: owner.createdAt.toISOString(),
    },
    reputation: calculateReputation(ownerProofs.map(toProof)),
    endorsementRequests: currentUserId === proof.userId ? requestDtos : [],
    viewerEndorsementRequest:
      currentUserId && currentUserId !== proof.userId
        ? requestDtos.find((entry) => entry.recipient.id === currentUserId && entry.status === 'pending') ?? null
        : null,
  })
}

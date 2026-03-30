import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { PeerVerification, Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'

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

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  const username = decodeURIComponent(params.username)

  const user = await prisma.user.findUnique({
    where: { username },
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

  const proofDtos = proofs.map(toProof)
  const reputation = calculateReputation(proofDtos)

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
  })
}

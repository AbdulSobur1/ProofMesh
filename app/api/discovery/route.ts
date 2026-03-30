import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { DiscoveryCandidate, DiscoveryResponse, PeerVerification, Proof } from '@/lib/types'

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
  tags: string
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  verifiedAt: Date | null
  createdAt: Date
  endorsements: Array<{
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
  tags: parseTags(proof.tags),
  txHash: proof.txHash,
  verificationStatus: proof.verificationStatus,
  verificationConfidence: proof.verificationConfidence,
  verificationSignals: parseVerificationSignals(proof.verificationSignals),
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: proof.endorsements.map(toEndorsement),
  endorsementCount: proof.endorsements.length,
  createdAt: proof.createdAt.toISOString(),
})

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      proofs: {
        orderBy: { createdAt: 'desc' },
        include: {
          endorsements: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })

  const candidates: DiscoveryCandidate[] = users
    .map((user) => {
      const proofs = user.proofs.map(toProof)
      const reputation = calculateReputation(proofs)

      return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        primaryProfession: getPrimaryProfession(proofs),
        reputation,
        topTags: reputation.tagFrequency.slice(0, 4).map((item) => item.tag),
        strongestProof: getStrongestProof(proofs),
      }
    })
    .filter((candidate) => candidate.reputation.totalProofs > 0)

  const response: DiscoveryResponse = { candidates }
  return NextResponse.json(response)
}

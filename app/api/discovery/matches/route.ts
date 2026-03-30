import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { buildRoleMatches } from '@/lib/services/role-matching'
import { ROLE_PROFILES, type RoleSlug } from '@/lib/role-taxonomy'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { DiscoveryCandidate, PeerVerification, Proof, RoleMatchResponse } from '@/lib/types'

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

const toCandidate = (entry: {
  createdAt: Date
  candidate: {
    id: string
    username: string
    createdAt: Date
    proofs: Array<{
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
    }>
  }
}): DiscoveryCandidate => {
  const proofs = entry.candidate.proofs.map(toProof)
  const reputation = calculateReputation(proofs)

  return {
    id: entry.candidate.id,
    username: entry.candidate.username,
    createdAt: entry.candidate.createdAt.toISOString(),
    primaryProfession: getPrimaryProfession(proofs),
    reputation,
    topTags: reputation.tagFrequency.slice(0, 4).map((item) => item.tag),
    proofTypes: Array.from(new Set(proofs.map((proof) => proof.proofType))),
    strongestProof: getStrongestProof(proofs),
    isSaved: true,
    savedAt: entry.createdAt.toISOString(),
  }
}

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const requestedRole = url.searchParams.get('role')
  if (!requestedRole || !(requestedRole in ROLE_PROFILES)) {
    return NextResponse.json({ error: 'A valid role is required' }, { status: 400 })
  }
  const roleSlug = requestedRole as RoleSlug

  const saved = await prisma.savedCandidate.findMany({
    where: { recruiterId },
    orderBy: { createdAt: 'desc' },
    include: {
      candidate: {
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
      },
    },
  })

  const candidates = saved.map(toCandidate).filter((candidate) => candidate.reputation.totalProofs > 0)
  const matches = buildRoleMatches(roleSlug, candidates)
  const role = ROLE_PROFILES[roleSlug]

  const response: RoleMatchResponse = {
    role: {
      slug: roleSlug,
      label: role.label,
      description: role.description,
      profession: role.profession,
      targetTags: [...role.targetTags],
      preferredProofTypes: [...role.preferredProofTypes],
      minScore: role.minScore,
    },
    matches,
  }

  return NextResponse.json(response)
}

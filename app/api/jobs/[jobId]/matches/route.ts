import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { toJobPostDto } from '@/lib/services/jobs'
import { buildJobMatches } from '@/lib/services/role-matching'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { DiscoveryCandidate, JobMatchResponse, PeerVerification, Proof } from '@/lib/types'

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

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const job = await prisma.jobPost.findFirst({
    where: {
      id: params.jobId,
      recruiterId,
    },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

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
  const jobDto = toJobPostDto(job)
  const matches = buildJobMatches(jobDto, candidates)

  const response: JobMatchResponse = {
    job: jobDto,
    matches,
  }

  return NextResponse.json(response)
}

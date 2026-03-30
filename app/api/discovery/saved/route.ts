import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { DiscoveryCandidate, DiscoveryResponse, PeerVerification, Proof } from '@/lib/types'

const payloadSchema = z.object({
  candidateId: z.string().min(1),
})

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

const mapCandidate = (entry: {
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

  const response: DiscoveryResponse = {
    candidates: saved.map(mapCandidate).filter((candidate) => candidate.reputation.totalProofs > 0),
  }

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = payloadSchema.parse(body)

    if (input.candidateId === recruiterId) {
      return NextResponse.json({ error: 'You cannot save your own profile' }, { status: 400 })
    }

    await prisma.savedCandidate.upsert({
      where: {
        recruiterId_candidateId: {
          recruiterId,
          candidateId: input.candidateId,
        },
      },
      update: {},
      create: {
        recruiterId,
        candidateId: input.candidateId,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid save payload' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = payloadSchema.parse(body)

    await prisma.savedCandidate.deleteMany({
      where: {
        recruiterId,
        candidateId: input.candidateId,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid remove payload' }, { status: 400 })
  }
}

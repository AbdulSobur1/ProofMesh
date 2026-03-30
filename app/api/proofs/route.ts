import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { evaluateProof } from '@/lib/services/ai-evaluator'
import { generateTxHash } from '@/lib/services/proof-service'
import { getCurrentToken } from '@/lib/auth-options'
import { parseTags, serializeTags } from '@/lib/services/tags'
import { PROOF_PROFESSIONS, PROOF_TYPES } from '@/lib/proof-taxonomy'
import { evaluateVerification, parseVerificationSignals, serializeVerificationSignals } from '@/lib/services/verification'
import { assessProofRisk } from '@/lib/services/risk'
import { PeerVerification, Proof } from '@/lib/types'

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  link: z.string().url().optional().or(z.literal('')),
  profession: z.enum(PROOF_PROFESSIONS),
  proofType: z.enum(PROOF_TYPES),
  outcomeSummary: z.string().max(240).optional().or(z.literal('')),
})

const toEndorsementDto = (endorsement: {
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

const toProofDto = (proof: {
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
  riskScore: number
  riskFlags: string
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
  riskScore: proof.riskScore,
  riskFlags: parseTags(proof.riskFlags),
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: (proof.endorsements ?? []).map(toEndorsementDto),
  endorsementCount: proof.endorsements?.length ?? 0,
  createdAt: proof.createdAt.toISOString(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ proofs: [], user: null })
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

  return NextResponse.json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    proofs: proofs.map(toProofDto),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = createSchema.parse(body)
    const token = await getCurrentToken(request)
    const currentUserId = token?.sub

    if (!currentUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: currentUserId } })

    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const evaluation = await evaluateProof({
      title: input.title,
      description: input.description,
      link: input.link || undefined,
      profession: input.profession,
      proofType: input.proofType,
      outcomeSummary: input.outcomeSummary || undefined,
    })

    const verification = evaluateVerification({
      score: evaluation.score,
      link: input.link || undefined,
      outcomeSummary: input.outcomeSummary || undefined,
      tags: evaluation.tags,
      endorsements: [],
    })

    const existingProofCount = await prisma.proof.count({
      where: { userId: user.id },
    })

    const risk = assessProofRisk({
      title: input.title,
      description: input.description,
      link: input.link || undefined,
      outcomeSummary: input.outcomeSummary || undefined,
      score: evaluation.score,
      tags: evaluation.tags,
      existingProofCount,
    })

    const proof = await prisma.proof.create({
      data: {
        title: input.title,
        description: input.description,
        link: input.link || null,
        profession: input.profession,
        proofType: input.proofType,
        outcomeSummary: input.outcomeSummary || null,
        score: evaluation.score,
        feedback: evaluation.feedback,
        tags: serializeTags(evaluation.tags),
        txHash: generateTxHash(),
        verificationStatus: verification.status,
        verificationConfidence: verification.confidence,
        verificationSignals: serializeVerificationSignals(verification.signals),
        riskScore: risk.score,
        riskFlags: serializeTags(risk.flags),
        moderationStatus: risk.moderationStatus,
        verifiedAt: verification.verifiedAt,
        userId: user.id,
      },
      include: {
        endorsements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (risk.moderationStatus === 'under_review') {
      await prisma.report.create({
        data: {
          targetType: 'proof',
          targetId: proof.id,
          reason: 'fraud',
          details: `Automatically flagged during submission review. Risk score ${risk.score}/100. ${risk.flags.join(' | ')}`,
          reporterId: user.id,
        },
      })
    }

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
      proof: toProofDto(proof),
    })
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid request payload',
      },
      { status: 400 }
    )
  }
}

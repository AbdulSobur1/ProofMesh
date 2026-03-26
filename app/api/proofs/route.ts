import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { evaluateProof } from '@/lib/services/ai-evaluator'
import { generateTxHash } from '@/lib/services/proof-service'
import { getCurrentToken } from '@/lib/auth-options'
import { parseTags, serializeTags } from '@/lib/services/tags'
import { PROOF_PROFESSIONS, PROOF_TYPES } from '@/lib/proof-taxonomy'
import { evaluateVerification, parseVerificationSignals, serializeVerificationSignals } from '@/lib/services/verification'

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  link: z.string().url().optional().or(z.literal('')),
  profession: z.enum(PROOF_PROFESSIONS),
  proofType: z.enum(PROOF_TYPES),
  outcomeSummary: z.string().max(240).optional().or(z.literal('')),
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
  verifiedAt: Date | null
  createdAt: Date
}) => ({
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
        verifiedAt: verification.verifiedAt,
        userId: user.id,
      },
    })

    return NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
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

import { NextResponse } from 'next/server'
import { calculateReputation } from '@/lib/services/reputation'
import { prisma } from '@/lib/db'
import { Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'

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
  createdAt: proof.createdAt.toISOString(),
})

export async function GET(
  _request: Request,
  { params }: { params: { proofId: string } }
) {
  const proof = await prisma.proof.findUnique({
    where: { id: params.proofId },
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

  const ownerProofs = await prisma.proof.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    proof: toProof(proof),
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    reputation: calculateReputation(ownerProofs.map(toProof)),
  })
}

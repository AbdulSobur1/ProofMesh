import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { parseTags } from '@/lib/services/tags'
import { Proof } from '@/lib/types'

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  score: number
  feedback: string | null
  tags: string
  txHash: string
  createdAt: Date
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(proof.tags),
  txHash: proof.txHash,
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
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: proof.userId },
  })

  if (!user) {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
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

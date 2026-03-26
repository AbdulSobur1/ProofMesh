import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  score: number
  feedback: string | null
  tags: unknown
  txHash: string
  createdAt: Date
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(typeof proof.tags === 'string' ? proof.tags : null),
  txHash: proof.txHash,
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
      },
    })
  }

  const proofs = await prisma.proof.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const proofDtos = proofs.map(toProof)
  const reputation = calculateReputation(proofDtos)

  return NextResponse.json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
    proofs: proofDtos,
    reputation,
  })
}

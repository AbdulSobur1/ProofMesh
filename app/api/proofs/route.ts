import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { evaluateProof } from '@/lib/services/ai-evaluator'
import { generateTxHash } from '@/lib/services/proof-service'
import { getCurrentToken } from '@/lib/auth-options'
import { parseTags, serializeTags } from '@/lib/services/tags'

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  link: z.string().url().optional().or(z.literal('')),
})

const toProofDto = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  score: number
  feedback: string | null
  tags: unknown
  txHash: string
  createdAt: Date
}) => ({
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
    })

    const proof = await prisma.proof.create({
      data: {
        id: generateId(),
        title: input.title,
        description: input.description,
        link: input.link || null,
        score: evaluation.score,
        feedback: evaluation.feedback,
        tags: serializeTags(evaluation.tags),
        txHash: generateTxHash(),
        userId: user.id,
      },
    })

    return NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
      proof: toProofDto(proof),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Invalid request payload',
      },
      { status: 400 }
    )
  }
}

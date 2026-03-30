import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { toFeedPost } from '@/lib/services/feed'

const createPostSchema = z.object({
  body: z.string().trim().min(1).max(1200),
  postType: z.enum(['text', 'proof_share']).default('text'),
  proofId: z.string().trim().optional(),
})

const postInclude = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      headline: true,
      avatarUrl: true,
      currentRole: true,
      currentCompany: true,
    },
  },
  proof: {
    select: {
      id: true,
      title: true,
      description: true,
      link: true,
      profession: true,
      proofType: true,
      outcomeSummary: true,
      score: true,
      feedback: true,
      tags: true,
      txHash: true,
      verificationStatus: true,
      verificationConfidence: true,
      verificationSignals: true,
      verifiedAt: true,
      createdAt: true,
    },
  },
} as const

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ posts: [] }, { status: 401 })
  }

  const acceptedConnections = await prisma.connection.findMany({
    where: {
      status: 'accepted',
      OR: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
    },
    select: {
      requesterId: true,
      recipientId: true,
    },
  })

  const networkUserIds = Array.from(
    new Set([
      currentUserId,
      ...acceptedConnections.map((connection) =>
        connection.requesterId === currentUserId ? connection.recipientId : connection.requesterId
      ),
    ])
  )

  const posts = await prisma.post.findMany({
    where: {
      userId: {
        in: networkUserIds,
      },
    },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    posts: posts.map(toFeedPost),
  })
}

export async function POST(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createPostSchema.parse(body)

    if (input.postType === 'proof_share' && !input.proofId) {
      return NextResponse.json({ error: 'A proof share requires a proofId' }, { status: 400 })
    }

    if (input.proofId) {
      const proof = await prisma.proof.findUnique({
        where: { id: input.proofId },
      })

      if (!proof || proof.userId !== currentUserId) {
        return NextResponse.json({ error: 'You can only share your own proofs' }, { status: 403 })
      }
    }

    const post = await prisma.post.create({
      data: {
        body: input.body,
        postType: input.postType,
        userId: currentUserId,
        proofId: input.proofId ?? null,
      },
      include: postInclude,
    })

    return NextResponse.json({ post: toFeedPost(post) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid post payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

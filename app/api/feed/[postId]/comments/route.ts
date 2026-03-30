import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { toFeedComment } from '@/lib/services/feed'

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
})

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

const commentInclude = {
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
} as const

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ comments: [] }, { status: 401 })
  }

  const comments = await prisma.postComment.findMany({
    where: { postId: params.postId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    comments: comments.map(toFeedComment),
  })
}

export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createCommentSchema.parse(body)

    const comment = await prisma.postComment.create({
      data: {
        postId: params.postId,
        userId: currentUserId,
        body: input.body,
      },
      include: commentInclude,
    })

    return NextResponse.json({ comment: toFeedComment(comment) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid comment payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

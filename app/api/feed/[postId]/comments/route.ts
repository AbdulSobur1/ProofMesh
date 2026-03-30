import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { toFeedComment } from '@/lib/services/feed'
import { createNotification } from '@/lib/services/notifications'

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
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ comments: [] }, { status: 401 })
  }

  const comments = await prisma.postComment.findMany({
    where: { postId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    comments: comments.map(toFeedComment),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createCommentSchema.parse(body)

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        userId: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: currentUserId,
        body: input.body,
      },
      include: commentInclude,
    })

    await createNotification({
      userId: post.userId,
      actorId: currentUserId,
      type: 'post_commented',
      title: 'New comment on your post',
      body: `@${comment.user.username} commented on your post.`,
      link: '/feed',
    })

    return NextResponse.json({ comment: toFeedComment(comment) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid comment payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

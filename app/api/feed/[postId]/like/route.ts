import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { createNotification } from '@/lib/services/notifications'

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: {
        postId: params.postId,
        userId: currentUserId,
      },
    },
  })

  if (existingLike) {
    await prisma.postLike.delete({
      where: {
        id: existingLike.id,
      },
    })

    return NextResponse.json({ liked: false })
  }

  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    select: {
      id: true,
      userId: true,
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const actor = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      username: true,
    },
  })

  await prisma.postLike.create({
    data: {
      postId: params.postId,
      userId: currentUserId,
    },
  })

  await createNotification({
    userId: post.userId,
    actorId: currentUserId,
    type: 'post_liked',
    title: 'Your post got a like',
    body: `@${actor?.username ?? 'Someone'} liked your post.`,
    link: '/feed',
  })

  return NextResponse.json({ liked: true })
}

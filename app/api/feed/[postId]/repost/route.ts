import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { createNotification } from '@/lib/services/notifications'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      body: true,
    },
  })

  if (!post || post.userId === currentUserId) {
    return NextResponse.json({ error: 'Post unavailable for reposting' }, { status: 404 })
  }

  const existing = await prisma.postRepost.findUnique({
    where: {
      postId_userId: {
        postId: post.id,
        userId: currentUserId,
      },
    },
  })

  if (existing) {
    await prisma.postRepost.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ reposted: false })
  }

  await prisma.postRepost.create({
    data: {
      postId: post.id,
      userId: currentUserId,
    },
  })

  await createNotification({
    userId: post.userId,
    actorId: currentUserId,
    type: 'post_reposted',
    title: 'Your post was reposted',
    body: 'Someone in your network reposted your update.',
    link: '/feed',
  })

  return NextResponse.json({ reposted: true })
}

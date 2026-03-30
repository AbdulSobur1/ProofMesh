import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

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

  await prisma.postLike.create({
    data: {
      postId: params.postId,
      userId: currentUserId,
    },
  })

  return NextResponse.json({ liked: true })
}

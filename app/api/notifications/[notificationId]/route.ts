import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function PATCH(
  request: Request,
  { params }: { params: { notificationId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: params.notificationId,
      userId: currentUserId,
    },
  })

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      readAt: notification.readAt ?? new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}

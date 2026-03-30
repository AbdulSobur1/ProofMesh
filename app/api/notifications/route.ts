import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { notificationInclude, toNotificationRecord } from '@/lib/services/notifications'
import { NotificationsResponse } from '@/lib/types'

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401 })
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: currentUserId },
      include: notificationInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: {
        userId: currentUserId,
        readAt: null,
      },
    }),
  ])

  const response: NotificationsResponse = {
    notifications: notifications.map(toNotificationRecord),
    unreadCount,
  }

  return NextResponse.json(response)
}

export async function PATCH(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: currentUserId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}

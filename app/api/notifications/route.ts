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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')

  const where = {
    userId: currentUserId,
    ...(status === 'unread' ? { readAt: null } : {}),
    ...(status === 'read' ? { NOT: { readAt: null } } : {}),
    ...(type && type !== 'all' ? { type } : {}),
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
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

  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null
  const ids = body?.ids?.filter(Boolean) ?? []

  await prisma.notification.updateMany({
    where: {
      userId: currentUserId,
      readAt: null,
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: {
      readAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}

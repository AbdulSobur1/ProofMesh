import { NotificationRecord, NotificationType } from '@/lib/types'
import { prisma } from '@/lib/db'

export const notificationActorSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

export const notificationInclude = {
  actor: {
    select: notificationActorSelect,
  },
} as const

export const toNotificationRecord = (notification: {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  readAt: Date | null
  createdAt: Date
  actor: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  } | null
}): NotificationRecord => ({
  id: notification.id,
  type: notification.type as NotificationType,
  title: notification.title,
  body: notification.body,
  link: notification.link,
  readAt: notification.readAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
  actor: notification.actor,
})

type CreateNotificationInput = {
  userId: string
  actorId?: string | null
  type: NotificationType
  title: string
  body: string
  link?: string | null
}

export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.userId === input.actorId) {
    return null
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  })
}

import { NotificationCategory, NotificationRecord, NotificationType } from '@/lib/types'
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

export const notificationCategoryByType: Record<NotificationType, NotificationCategory> = {
  connection_request: 'connections',
  connection_accepted: 'connections',
  message_received: 'messages',
  endorsement_requested: 'endorsements',
  endorsement_request_completed: 'endorsements',
  endorsement_request_declined: 'endorsements',
  post_liked: 'social',
  post_commented: 'social',
  post_reposted: 'social',
  job_application_submitted: 'jobs',
  job_application_status: 'jobs',
}

export const notificationSettingsSelect = {
  notifyConnections: true,
  notifyMessages: true,
  notifyEndorsements: true,
  notifySocial: true,
  notifyJobs: true,
  dailyDigestEnabled: true,
} as const

export const toNotificationSettings = (user: {
  notifyConnections: boolean
  notifyMessages: boolean
  notifyEndorsements: boolean
  notifySocial: boolean
  notifyJobs: boolean
  dailyDigestEnabled: boolean
}) => ({
  connections: user.notifyConnections,
  messages: user.notifyMessages,
  endorsements: user.notifyEndorsements,
  social: user.notifySocial,
  jobs: user.notifyJobs,
  dailyDigest: user.dailyDigestEnabled,
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

  const recipient = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      notifyConnections: true,
      notifyMessages: true,
      notifyEndorsements: true,
      notifySocial: true,
      notifyJobs: true,
    },
  })

  if (!recipient) {
    return null
  }

  const category = notificationCategoryByType[input.type]
  const isEnabled =
    (category === 'connections' && recipient.notifyConnections) ||
    (category === 'messages' && recipient.notifyMessages) ||
    (category === 'endorsements' && recipient.notifyEndorsements) ||
    (category === 'social' && recipient.notifySocial) ||
    (category === 'jobs' && recipient.notifyJobs)

  if (!isEnabled) {
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

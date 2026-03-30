import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { notificationSettingsSelect, toNotificationSettings } from '@/lib/services/notifications'
import { NotificationSettingsResponse } from '@/lib/types'

const settingsSchema = z.object({
  connections: z.boolean(),
  messages: z.boolean(),
  endorsements: z.boolean(),
  social: z.boolean(),
  jobs: z.boolean(),
  dailyDigest: z.boolean(),
})

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: notificationSettingsSelect,
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const response: NotificationSettingsResponse = {
    settings: toNotificationSettings(user),
  }

  return NextResponse.json(response)
}

export async function PATCH(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const settings = settingsSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        notifyConnections: settings.connections,
        notifyMessages: settings.messages,
        notifyEndorsements: settings.endorsements,
        notifySocial: settings.social,
        notifyJobs: settings.jobs,
        dailyDigestEnabled: settings.dailyDigest,
      },
      select: notificationSettingsSelect,
    })

    const response: NotificationSettingsResponse = {
      settings: toNotificationSettings(user),
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid settings payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { toConnectionRecord } from '@/lib/services/network'
import { createNotification } from '@/lib/services/notifications'
import { syncUserTrustLevel } from '@/lib/services/trust-server'

const actionSchema = z.object({
  action: z.enum(['accept', 'decline', 'cancel']),
})

const connectionInclude = {
  requester: {
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
  recipient: {
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

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function PATCH(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = actionSchema.parse(body)

    const connection = await prisma.connection.findUnique({
      where: { id: params.connectionId },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection request not found' }, { status: 404 })
    }

    if (input.action === 'accept') {
      if (connection.recipientId !== currentUserId || connection.status !== 'pending') {
        return NextResponse.json({ error: 'You cannot accept this request' }, { status: 403 })
      }

      const accepted = await prisma.connection.update({
        where: { id: connection.id },
        data: {
          status: 'accepted',
          respondedAt: new Date(),
        },
        include: connectionInclude,
      })

      await createNotification({
        userId: accepted.requester.id,
        actorId: currentUserId,
        type: 'connection_accepted',
        title: 'Connection request accepted',
        body: `@${accepted.recipient.username} accepted your connection request.`,
        link: `/profile/${encodeURIComponent(accepted.recipient.username)}`,
      })

      await Promise.all([
        syncUserTrustLevel(accepted.requester.id),
        syncUserTrustLevel(accepted.recipient.id),
      ])

      return NextResponse.json({ connection: toConnectionRecord(accepted) })
    }

    if (input.action === 'decline') {
      if (connection.recipientId !== currentUserId || connection.status !== 'pending') {
        return NextResponse.json({ error: 'You cannot decline this request' }, { status: 403 })
      }

      await prisma.connection.delete({
        where: { id: connection.id },
      })

      return NextResponse.json({ ok: true })
    }

    if (connection.requesterId !== currentUserId || connection.status !== 'pending') {
      return NextResponse.json({ error: 'You cannot cancel this request' }, { status: 403 })
    }

    await prisma.connection.delete({
      where: { id: connection.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await prisma.connection.findUnique({
    where: { id: params.connectionId },
  })

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  if (connection.status !== 'accepted') {
    return NextResponse.json({ error: 'Only accepted connections can be removed here' }, { status: 400 })
  }

  if (connection.requesterId !== currentUserId && connection.recipientId !== currentUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.connection.delete({
    where: { id: connection.id },
  })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { conversationParticipantSelect, toConversationRecord } from '@/lib/services/messages'
import { createNotification } from '@/lib/services/notifications'

const createConversationSchema = z.object({
  targetUsername: z.string().trim().min(1),
  body: z.string().trim().min(1).max(2000),
  proofId: z.string().trim().optional(),
})

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ conversations: [] }, { status: 401 })
  }

  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: currentUserId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: conversationParticipantSelect,
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              proof: true,
            },
          },
        },
      },
    },
    orderBy: {
      conversation: {
        lastMessageAt: 'desc',
      },
    },
  })

  return NextResponse.json({
    conversations: memberships.map((membership) =>
      toConversationRecord(membership.conversation, currentUserId)
    ),
  })
}

export async function POST(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createConversationSchema.parse(body)

    const targetUser = await prisma.user.findUnique({
      where: { username: input.targetUsername },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === currentUserId) {
      return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 })
    }

    const acceptedConnection = await prisma.connection.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: currentUserId, recipientId: targetUser.id },
          { requesterId: targetUser.id, recipientId: currentUserId },
        ],
      },
    })

    if (!acceptedConnection) {
      return NextResponse.json({ error: 'You can only message accepted connections' }, { status: 403 })
    }

    if (input.proofId) {
      const proof = await prisma.proof.findUnique({
        where: { id: input.proofId },
      })

      if (!proof || proof.userId !== currentUserId) {
        return NextResponse.json({ error: 'You can only attach your own proof' }, { status: 403 })
      }
    }

    const existingMemberships = await prisma.conversationParticipant.findMany({
      where: {
        userId: {
          in: [currentUserId, targetUser.id],
        },
      },
      select: {
        conversationId: true,
        userId: true,
      },
    })

    const membershipMap = new Map<string, Set<string>>()
    existingMemberships.forEach((membership) => {
      const set = membershipMap.get(membership.conversationId) ?? new Set<string>()
      set.add(membership.userId)
      membershipMap.set(membership.conversationId, set)
    })

    const existingConversationId =
      Array.from(membershipMap.entries()).find(
        ([, userIds]) =>
          userIds.has(currentUserId) &&
          userIds.has(targetUser.id) &&
          userIds.size === 2
      )?.[0] ?? null

    const conversation = existingConversationId
      ? await prisma.conversation.update({
          where: { id: existingConversationId },
          data: {
            lastMessageAt: new Date(),
            messages: {
              create: {
                body: input.body,
                senderId: currentUserId,
                proofId: input.proofId || null,
              },
            },
            participants: {
              updateMany: [
                {
                  where: { userId: currentUserId },
                  data: { lastReadAt: new Date() },
                },
              ],
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: conversationParticipantSelect,
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              include: {
                proof: true,
              },
            },
          },
        })
      : await prisma.conversation.create({
          data: {
            lastMessageAt: new Date(),
            participants: {
              create: [
                {
                  userId: currentUserId,
                  lastReadAt: new Date(),
                },
                {
                  userId: targetUser.id,
                },
              ],
            },
            messages: {
              create: {
                body: input.body,
                senderId: currentUserId,
                proofId: input.proofId || null,
              },
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  select: conversationParticipantSelect,
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              include: {
                proof: true,
              },
            },
          },
        })

    await createNotification({
      userId: targetUser.id,
      actorId: currentUserId,
      type: 'message_received',
      title: 'New message',
      body: `@${conversation.participants.find((participant) => participant.user.id === currentUserId)?.user.username ?? 'Someone'} sent you a message.`,
      link: `/messages?user=${encodeURIComponent(
        conversation.participants.find((participant) => participant.user.id === currentUserId)?.user.username ?? ''
      )}`,
    })

    return NextResponse.json({
      conversation: toConversationRecord(conversation, currentUserId),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid message payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

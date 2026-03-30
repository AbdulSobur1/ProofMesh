import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { conversationParticipantSelect, toConversationRecord, toMessageRecord } from '@/lib/services/messages'
import { createNotification } from '@/lib/services/notifications'

const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  proofId: z.string().trim().optional(),
})

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: currentUserId,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: conversationParticipantSelect,
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          proof: true,
        },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  await prisma.conversationParticipant.update({
    where: { id: membership.id },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json({
    conversation: toConversationRecord(
      {
        ...conversation,
        messages: [...conversation.messages].reverse(),
      },
      currentUserId
    ),
    messages: conversation.messages.map(toMessageRecord),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: currentUserId,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const input = sendMessageSchema.parse(body)

    const sender = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        username: true,
      },
    })

    if (input.proofId) {
      const proof = await prisma.proof.findUnique({
        where: { id: input.proofId },
      })

      if (!proof || proof.userId !== currentUserId) {
        return NextResponse.json({ error: 'You can only attach your own proof' }, { status: 403 })
      }
    }

    const participantIds = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
      },
      select: {
        userId: true,
      },
    })

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          body: input.body,
          senderId: currentUserId,
          conversationId,
          proofId: input.proofId || null,
        },
        include: {
          proof: true,
        },
      })

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: createdMessage.createdAt,
        },
      })

      await tx.conversationParticipant.update({
        where: { id: membership.id },
        data: {
          lastReadAt: createdMessage.createdAt,
        },
      })

      return createdMessage
    })

    await Promise.all(
      participantIds
        .filter((participant) => participant.userId !== currentUserId)
        .map((participant) =>
          createNotification({
            userId: participant.userId,
            actorId: currentUserId,
            type: 'message_received',
            title: 'New message',
            body: `@${sender?.username ?? 'Someone'} sent you a message.`,
            link: `/messages?user=${encodeURIComponent(sender?.username ?? '')}`,
          })
        )
    )

    return NextResponse.json({ message: toMessageRecord(message) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid message payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

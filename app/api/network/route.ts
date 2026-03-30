import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { emptyNetworkCounts, toConnectionRecord } from '@/lib/services/network'
import { createNotification } from '@/lib/services/notifications'

const requestSchema = z.object({
  targetUsername: z.string().trim().min(1),
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

export async function GET(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json(
      {
        incomingRequests: [],
        outgoingRequests: [],
        connections: [],
        counts: emptyNetworkCounts,
      },
      { status: 401 }
    )
  }

  const [incomingRequests, outgoingRequests, connections] = await Promise.all([
    prisma.connection.findMany({
      where: {
        recipientId: currentUserId,
        status: 'pending',
      },
      include: connectionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.connection.findMany({
      where: {
        requesterId: currentUserId,
        status: 'pending',
      },
      include: connectionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.connection.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: currentUserId }, { recipientId: currentUserId }],
      },
      include: connectionInclude,
      orderBy: { respondedAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    incomingRequests: incomingRequests.map(toConnectionRecord),
    outgoingRequests: outgoingRequests.map(toConnectionRecord),
    connections: connections.map(toConnectionRecord),
    counts: {
      totalConnections: connections.length,
      incomingRequests: incomingRequests.length,
      outgoingRequests: outgoingRequests.length,
    },
  })
}

export async function POST(request: Request) {
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = requestSchema.parse(body)

    const targetUser = await prisma.user.findUnique({
      where: { username: input.targetUsername },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === currentUserId) {
      return NextResponse.json({ error: 'You cannot connect with yourself' }, { status: 400 })
    }

    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, recipientId: targetUser.id },
          { requesterId: targetUser.id, recipientId: currentUserId },
        ],
      },
    })

    if (existingConnection?.status === 'accepted') {
      return NextResponse.json({ error: 'You are already connected' }, { status: 409 })
    }

    if (existingConnection?.status === 'pending') {
      return NextResponse.json({ error: 'A pending request already exists' }, { status: 409 })
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId: currentUserId,
        recipientId: targetUser.id,
      },
      include: connectionInclude,
    })

    await createNotification({
      userId: targetUser.id,
      actorId: currentUserId,
      type: 'connection_request',
      title: 'New connection request',
      body: `@${connection.requester.username} wants to connect with you on ProofMesh.`,
      link: '/network',
    })

    return NextResponse.json({ connection: toConnectionRecord(connection) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

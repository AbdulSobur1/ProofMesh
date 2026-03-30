import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { createNotification } from '@/lib/services/notifications'

const createRequestSchema = z.object({
  recipientUsername: z.string().trim().min(2).max(40),
  relationship: z.enum(['peer', 'client', 'manager', 'collaborator']),
  message: z.string().trim().max(300).optional().default(''),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proofId: string }> }
) {
  const { proofId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createRequestSchema.parse(body)

    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    if (proof.userId !== currentUserId) {
      return NextResponse.json({ error: 'Only the proof owner can request endorsements' }, { status: 403 })
    }

    const recipient = await prisma.user.findUnique({
      where: { username: input.recipientUsername },
      select: {
        id: true,
        username: true,
      },
    })

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient account not found' }, { status: 404 })
    }

    if (recipient.id === currentUserId) {
      return NextResponse.json({ error: 'You cannot request an endorsement from yourself' }, { status: 400 })
    }

    const existingPending = await prisma.proofEndorsementRequest.findFirst({
      where: {
        proofId: proof.id,
        recipientId: recipient.id,
        status: 'pending',
      },
    })

    if (existingPending) {
      return NextResponse.json({ error: 'There is already a pending request for this person' }, { status: 409 })
    }

    const created = await prisma.proofEndorsementRequest.create({
      data: {
        proofId: proof.id,
        requesterId: currentUserId,
        recipientId: recipient.id,
        relationship: input.relationship,
        message: input.message || null,
      },
    })

    await createNotification({
      userId: recipient.id,
      actorId: currentUserId,
      type: 'endorsement_requested',
      title: 'Endorsement requested',
      body: `@${proof.user.username} asked you to verify "${proof.title}".`,
      link: `/proof/${encodeURIComponent(proof.id)}?request=${encodeURIComponent(created.id)}`,
    })

    return NextResponse.json({ requestId: created.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

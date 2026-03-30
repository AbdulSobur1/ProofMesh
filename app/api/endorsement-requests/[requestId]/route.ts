import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { createNotification } from '@/lib/services/notifications'

const updateRequestSchema = z.object({
  action: z.enum(['decline']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = updateRequestSchema.parse(body)

    const endorsementRequest = await prisma.proofEndorsementRequest.findUnique({
      where: { id: requestId },
      include: {
        proof: {
          select: {
            id: true,
            title: true,
          },
        },
        requester: {
          select: {
            id: true,
            username: true,
          },
        },
        recipient: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    if (!endorsementRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (endorsementRequest.recipientId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (endorsementRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been handled' }, { status: 400 })
    }

    if (input.action === 'decline') {
      await prisma.proofEndorsementRequest.update({
        where: { id: endorsementRequest.id },
        data: {
          status: 'declined',
          respondedAt: new Date(),
        },
      })

      await createNotification({
        userId: endorsementRequest.requester.id,
        actorId: currentUserId,
        type: 'endorsement_request_declined',
        title: 'Endorsement request declined',
        body: `@${endorsementRequest.recipient.username} declined your request to verify "${endorsementRequest.proof.title}".`,
        link: `/proof/${encodeURIComponent(endorsementRequest.proof.id)}`,
      })

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

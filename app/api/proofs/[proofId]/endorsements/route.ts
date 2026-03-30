import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { parseTags } from '@/lib/services/tags'
import { evaluateVerification, serializeVerificationSignals } from '@/lib/services/verification'
import { getCurrentToken } from '@/lib/auth-options'
import { PeerVerification, type PeerVerificationRelationship } from '@/lib/types'
import { syncUserTrustLevel } from '@/lib/services/trust-server'
import { parseEvidenceItems } from '@/lib/services/evidence'
import { createNotification } from '@/lib/services/notifications'

const RELATIONSHIPS = ['peer', 'client', 'manager', 'collaborator'] as const

const endorsementSchema = z.object({
  verifierName: z.string().min(2).max(80),
  verifierRole: z.string().max(80).optional().or(z.literal('')),
  verifierCompany: z.string().max(80).optional().or(z.literal('')),
  relationship: z.enum(RELATIONSHIPS),
  message: z.string().min(24).max(500),
})

const toEndorsement = (endorsement: {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  verifiedReviewer: boolean
  reviewerTrustLevel: string
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  verifiedReviewer: endorsement.verifiedReviewer,
  reviewerTrustLevel: endorsement.reviewerTrustLevel,
  relationship: endorsement.relationship as PeerVerificationRelationship,
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ proofId: string }> }
) {
  const { proofId } = await params
  const endorsements = await prisma.proofEndorsement.findMany({
    where: { proofId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ endorsements: endorsements.map(toEndorsement) })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proofId: string }> }
) {
  const { proofId } = await params
  try {
    const body = await request.json()
    const input = endorsementSchema.parse(body)
    const token = await getCurrentToken(request)
    const reviewer = token?.sub ? await syncUserTrustLevel(token.sub) : null

    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        endorsements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    const pendingRequest = reviewer?.id
      ? await prisma.proofEndorsementRequest.findFirst({
          where: {
            proofId: proof.id,
            recipientId: reviewer.id,
            status: 'pending',
          },
          include: {
            requester: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        })
      : null

    const created = await prisma.proofEndorsement.create({
      data: {
        proofId: proof.id,
        verifierName: reviewer?.username ?? input.verifierName,
        verifierRole: input.verifierRole || null,
        verifierCompany: input.verifierCompany || null,
        verifiedReviewer: Boolean(reviewer?.identityVerifiedAt),
        reviewerTrustLevel: reviewer?.trustLevel ?? 'standard',
        reviewerUserId: reviewer?.id ?? null,
        relationship: input.relationship,
        message: input.message,
      },
    })

    if (pendingRequest) {
      await prisma.proofEndorsementRequest.update({
        where: { id: pendingRequest.id },
        data: {
          status: 'completed',
          respondedAt: new Date(),
        },
      })

      await createNotification({
        userId: pendingRequest.requester.id,
        actorId: reviewer?.id ?? null,
        type: 'endorsement_request_completed',
        title: 'Endorsement request completed',
        body: `@${reviewer?.username ?? created.verifierName} verified "${proof.title}".`,
        link: `/proof/${encodeURIComponent(proof.id)}`,
      })
    }

    const allEndorsements = [created, ...proof.endorsements]
    const verification = evaluateVerification({
      score: proof.score,
      link: proof.link,
      evidenceCount: parseEvidenceItems(proof.evidenceItems).length,
      outcomeSummary: proof.outcomeSummary,
      tags: parseTags(proof.tags),
      endorsements: allEndorsements.map((endorsement) => ({
        relationship: endorsement.relationship as PeerVerificationRelationship,
        message: endorsement.message,
        verifierCompany: endorsement.verifierCompany,
        verifiedReviewer: endorsement.verifiedReviewer,
        reviewerTrustLevel: endorsement.reviewerTrustLevel,
      })),
    })

    await prisma.proof.update({
      where: { id: proof.id },
      data: {
        verificationStatus: verification.status,
        verificationConfidence: verification.confidence,
        verificationSignals: serializeVerificationSignals(verification.signals),
        verifiedAt: verification.verifiedAt,
      },
    })

    return NextResponse.json({ endorsement: toEndorsement(created) })
  } catch {
    return NextResponse.json({ error: 'Invalid endorsement payload' }, { status: 400 })
  }
}

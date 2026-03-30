import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { parseTags } from '@/lib/services/tags'
import { evaluateVerification, serializeVerificationSignals } from '@/lib/services/verification'
import { PeerVerification, type PeerVerificationRelationship } from '@/lib/types'

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
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  relationship: endorsement.relationship as PeerVerificationRelationship,
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

export async function GET(
  _request: Request,
  { params }: { params: { proofId: string } }
) {
  const endorsements = await prisma.proofEndorsement.findMany({
    where: { proofId: params.proofId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ endorsements: endorsements.map(toEndorsement) })
}

export async function POST(
  request: Request,
  { params }: { params: { proofId: string } }
) {
  try {
    const body = await request.json()
    const input = endorsementSchema.parse(body)

    const proof = await prisma.proof.findUnique({
      where: { id: params.proofId },
      include: {
        endorsements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    const created = await prisma.proofEndorsement.create({
      data: {
        proofId: proof.id,
        verifierName: input.verifierName,
        verifierRole: input.verifierRole || null,
        verifierCompany: input.verifierCompany || null,
        relationship: input.relationship,
        message: input.message,
      },
    })

    const allEndorsements = [created, ...proof.endorsements]
    const verification = evaluateVerification({
      score: proof.score,
      link: proof.link,
      outcomeSummary: proof.outcomeSummary,
      tags: parseTags(proof.tags),
      endorsements: allEndorsements.map((endorsement) => ({
        relationship: endorsement.relationship,
        message: endorsement.message,
        verifierCompany: endorsement.verifierCompany,
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

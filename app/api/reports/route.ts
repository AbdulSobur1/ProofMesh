import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

const createReportSchema = z.object({
  targetType: z.enum(['proof', 'post']),
  targetId: z.string().trim().min(1),
  reason: z.enum(['spam', 'abuse', 'fraud', 'misleading', 'copyright', 'other']),
  details: z.string().trim().max(1000).optional().default(''),
})

export async function POST(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createReportSchema.parse(body)

    if (input.targetType === 'proof') {
      const proof = await prisma.proof.findUnique({ where: { id: input.targetId } })
      if (!proof) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
      }
    }

    if (input.targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: input.targetId } })
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
    }

    const report = await prisma.report.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details || null,
        reporterId: currentUserId,
      },
    })

    if (input.targetType === 'proof') {
      await prisma.proof.update({
        where: { id: input.targetId },
        data: { moderationStatus: 'under_review' },
      })
    }

    if (input.targetType === 'post') {
      await prisma.post.update({
        where: { id: input.targetId },
        data: { moderationStatus: 'under_review' },
      })
    }

    return NextResponse.json({ reportId: report.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid report payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

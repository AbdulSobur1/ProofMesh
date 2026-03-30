import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { isAdminUsername } from '@/lib/services/admin'

const updateSchema = z.object({
  reportStatus: z.enum(['open', 'reviewed', 'dismissed', 'actioned']),
  contentStatus: z.enum(['active', 'under_review', 'removed']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  const token = await getCurrentToken(request)
  const adminUser = token?.sub
    ? await prisma.user.findUnique({
        where: { id: token.sub },
        select: { username: true },
      })
    : null

  if (!token?.sub || !isAdminUsername(adminUser?.username ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const report = await prisma.report.findUnique({
    where: { id: params.reportId },
  })

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const input = updateSchema.parse(body)

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: input.reportStatus,
        resolvedAt: input.reportStatus === 'open' ? null : new Date(),
      },
    })

    if (input.contentStatus && report.targetType === 'proof') {
      await prisma.proof.update({
        where: { id: report.targetId },
        data: { moderationStatus: input.contentStatus },
      })
    }

    if (input.contentStatus && report.targetType === 'post') {
      await prisma.post.update({
        where: { id: report.targetId },
        data: { moderationStatus: input.contentStatus },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid moderation update'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

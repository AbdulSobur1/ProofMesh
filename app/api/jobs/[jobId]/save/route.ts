import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

async function getCurrentUserId(request: Request) {
  const token = await getCurrentToken(request)
  return token?.sub ?? null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  await prisma.savedJob.upsert({
    where: {
      userId_jobId: {
        userId: currentUserId,
        jobId: job.id,
      },
    },
    create: {
      userId: currentUserId,
      jobId: job.id,
    },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const currentUserId = await getCurrentUserId(request)

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.savedJob.deleteMany({
    where: {
      userId: currentUserId,
      jobId,
    },
  })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { JobApplicationsResponse } from '@/lib/types'
import { toJobApplicationDto, toJobPostDto } from '@/lib/services/jobs'
import { createNotification } from '@/lib/services/notifications'

const applySchema = z.object({
  note: z.string().trim().max(1200).optional().default(''),
  selectedProofId: z.string().trim().optional(),
})

const applicantInclude = {
  applicant: {
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
  selectedProof: {
    select: {
      id: true,
      title: true,
      description: true,
      link: true,
      profession: true,
      proofType: true,
      outcomeSummary: true,
      score: true,
      feedback: true,
      tags: true,
      txHash: true,
      verificationStatus: true,
      verificationConfidence: true,
      verificationSignals: true,
      verifiedAt: true,
      createdAt: true,
    },
  },
} as const

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const job = await prisma.jobPost.findFirst({
    where: {
      id: params.jobId,
      recruiterId,
    },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const applications = await prisma.jobApplication.findMany({
    where: {
      jobId: job.id,
    },
    include: applicantInclude,
    orderBy: { createdAt: 'desc' },
  })

  const response: JobApplicationsResponse = {
    job: toJobPostDto(job),
    applications: applications.map(toJobApplicationDto),
  }

  return NextResponse.json(response)
}

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const token = await getCurrentToken(request)
  const applicantId = token?.sub

  if (!applicantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = applySchema.parse(body)

    const job = await prisma.jobPost.findUnique({
      where: { id: params.jobId },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.recruiterId === applicantId) {
      return NextResponse.json({ error: 'You cannot apply to your own job' }, { status: 400 })
    }

    if (input.selectedProofId) {
      const proof = await prisma.proof.findUnique({
        where: { id: input.selectedProofId },
      })

      if (!proof || proof.userId !== applicantId) {
        return NextResponse.json({ error: 'You can only attach your own proof' }, { status: 403 })
      }
    }

    const application = await prisma.jobApplication.upsert({
      where: {
        jobId_applicantId: {
          jobId: job.id,
          applicantId,
        },
      },
      create: {
        jobId: job.id,
        applicantId,
        note: input.note || null,
        selectedProofId: input.selectedProofId || null,
      },
      update: {
        note: input.note || null,
        selectedProofId: input.selectedProofId || null,
        status: 'submitted',
      },
      include: applicantInclude,
    })

    await createNotification({
      userId: job.recruiterId,
      actorId: applicantId,
      type: 'job_application_submitted',
      title: 'New job application',
      body: `@${application.applicant.username} applied to ${job.title}.`,
      link: `/discover/jobs`,
    })

    return NextResponse.json({
      application: toJobApplicationDto(application),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid application payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

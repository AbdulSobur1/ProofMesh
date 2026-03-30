import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { toJobApplicationDto } from '@/lib/services/jobs'
import { createNotification } from '@/lib/services/notifications'

const updateSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'shortlisted', 'rejected']),
  recruiterNotes: z.string().trim().max(2000).optional(),
  interviewStage: z.enum(['application_review', 'intro_call', 'skills_interview', 'final_interview', 'offer', 'hired']).nullable().optional(),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string; applicationId: string }> }
) {
  const { jobId, applicationId } = await params
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = updateSchema.parse(body)

    const job = await prisma.jobPost.findFirst({
      where: {
        id: jobId,
        recruiterId,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        jobId: job.id,
      },
    })

    if (!existingApplication) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const application = await prisma.jobApplication.update({
      where: {
        id: existingApplication.id,
      },
      data: {
        status: input.status,
        recruiterNotes: input.recruiterNotes ?? existingApplication.recruiterNotes,
        interviewStage: input.interviewStage === undefined ? existingApplication.interviewStage : input.interviewStage,
      },
      include: applicantInclude,
    })

    if (
      existingApplication.status !== input.status ||
      existingApplication.interviewStage !== (input.interviewStage === undefined ? existingApplication.interviewStage : input.interviewStage)
    ) {
      const stageLabel = input.interviewStage
        ? ` Stage: ${input.interviewStage.replaceAll('_', ' ')}.`
        : ''

      await createNotification({
        userId: application.applicant.id,
        actorId: recruiterId,
        type: 'job_application_status',
        title: 'Application status updated',
        body: `Your application for ${job.title} is now ${input.status}.${stageLabel}`,
        link: '/jobs',
      })
    }

    return NextResponse.json({
      application: toJobApplicationDto(application),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid application status'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

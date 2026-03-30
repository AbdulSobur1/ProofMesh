import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { CandidateJobsResponse, type JobApplicationStatus } from '@/lib/types'
import { toJobApplicationDto, toJobPostDto } from '@/lib/services/jobs'

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.jobPost.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      applications: {
        where: {
          applicantId: currentUserId,
        },
        select: {
          status: true,
        },
        take: 1,
      },
      savedByUsers: {
        where: {
          userId: currentUserId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      company: true,
    },
  })

  const applications = await prisma.jobApplication.findMany({
    where: {
      applicantId: currentUserId,
    },
    include: {
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
    },
    orderBy: { updatedAt: 'desc' },
  })

  const response: CandidateJobsResponse = {
    jobs: jobs.map((job) => {
      const application = job.applications[0] ?? null
      return {
        ...toJobPostDto(job),
        hasApplied: Boolean(application),
        applicationStatus: (application?.status as JobApplicationStatus | undefined) ?? null,
        isSaved: job.savedByUsers.length > 0,
      }
    }),
    applications: applications.map(toJobApplicationDto),
  }

  return NextResponse.json(response)
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { CandidateJobsResponse } from '@/lib/types'
import { toJobPostDto } from '@/lib/services/jobs'

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
    },
  })

  const response: CandidateJobsResponse = {
    jobs: jobs.map((job) => {
      const application = job.applications[0] ?? null
      return {
        ...toJobPostDto(job),
        hasApplied: Boolean(application),
        applicationStatus: application?.status ?? null,
      }
    }),
  }

  return NextResponse.json(response)
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { PROOF_PROFESSIONS, PROOF_TYPES } from '@/lib/proof-taxonomy'
import { JobPostsResponse } from '@/lib/types'
import { serializeStringArray, toJobPostDto } from '@/lib/services/jobs'

const jobSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(2000),
  profession: z.enum(PROOF_PROFESSIONS),
  targetTags: z.array(z.string().min(1).max(40)).max(8),
  preferredProofTypes: z.array(z.enum(PROOF_TYPES)).max(4),
  minScore: z.number().min(0).max(10),
})

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.jobPost.findMany({
    where: { recruiterId },
    orderBy: { createdAt: 'desc' },
    include: {
      company: true,
    },
  })

  const response: JobPostsResponse = {
    jobs: jobs.map(toJobPostDto),
  }

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub

  if (!recruiterId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = jobSchema.parse(body)

    const job = await prisma.jobPost.create({
      data: {
        recruiterId,
        title: input.title,
        description: input.description,
        profession: input.profession,
        targetTags: serializeStringArray(input.targetTags),
        preferredProofTypes: serializeStringArray(input.preferredProofTypes),
        minScore: input.minScore,
        companyId:
          (
            await prisma.companyMember.findFirst({
              where: {
                userId: recruiterId,
              },
              select: {
                companyId: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            })
          )?.companyId ?? null,
      },
      include: {
        company: true,
      },
    })

    return NextResponse.json({ job: toJobPostDto(job) })
  } catch {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 })
  }
}

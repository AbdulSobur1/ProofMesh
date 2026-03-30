import { JobPost } from '@/lib/types'

export const parseStringArray = (value: string | null | undefined): string[] => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as string[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

export const serializeStringArray = (value: string[]) => JSON.stringify(value)

export const toJobPostDto = (job: {
  id: string
  title: string
  description: string
  profession: string
  targetTags: string
  preferredProofTypes: string
  minScore: number
  createdAt: Date
  updatedAt: Date
}): JobPost => ({
  id: job.id,
  title: job.title,
  description: job.description,
  profession: job.profession,
  targetTags: parseStringArray(job.targetTags),
  preferredProofTypes: parseStringArray(job.preferredProofTypes),
  minScore: job.minScore,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
})

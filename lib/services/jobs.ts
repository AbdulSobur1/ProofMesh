import { JobApplication, JobPost, Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'

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

const toProofDto = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: string
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  verifiedAt: Date | null
  createdAt: Date
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  profession: proof.profession,
  proofType: proof.proofType,
  outcomeSummary: proof.outcomeSummary,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(proof.tags),
  txHash: proof.txHash,
  verificationStatus: proof.verificationStatus,
  verificationConfidence: proof.verificationConfidence,
  verificationSignals: parseVerificationSignals(proof.verificationSignals),
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: [],
  endorsementCount: 0,
  createdAt: proof.createdAt.toISOString(),
})

export const toJobApplicationDto = (application: {
  id: string
  status: string
  note: string | null
  createdAt: Date
  updatedAt: Date
  applicant: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
  selectedProof: {
    id: string
    title: string
    description: string
    link: string | null
    profession: string
    proofType: string
    outcomeSummary: string | null
    score: number
    feedback: string | null
    tags: string
    txHash: string
    verificationStatus: string
    verificationConfidence: number
    verificationSignals: string
    verifiedAt: Date | null
    createdAt: Date
  } | null
}): JobApplication => ({
  id: application.id,
  status: application.status as JobApplication['status'],
  note: application.note,
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString(),
  applicant: {
    id: application.applicant.id,
    username: application.applicant.username,
    displayName: application.applicant.displayName,
    headline: application.applicant.headline,
    avatarUrl: application.applicant.avatarUrl,
    currentRole: application.applicant.currentRole,
    currentCompany: application.applicant.currentCompany,
  },
  selectedProof: application.selectedProof ? toProofDto(application.selectedProof) : null,
})

import { prisma } from '@/lib/db'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { parseStringArray } from '@/lib/services/jobs'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'

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
  endorsements: Array<{
    id: string
    verifierName: string
    verifierRole: string | null
    verifierCompany: string | null
    relationship: string
    message: string
    createdAt: Date
  }>
}) => ({
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
  endorsements: proof.endorsements.map((endorsement) => ({
    id: endorsement.id,
    verifierName: endorsement.verifierName,
    verifierRole: endorsement.verifierRole,
    verifierCompany: endorsement.verifierCompany,
    relationship: endorsement.relationship as 'peer' | 'client' | 'manager' | 'collaborator',
    message: endorsement.message,
    createdAt: endorsement.createdAt.toISOString(),
  })),
  endorsementCount: proof.endorsements.length,
  createdAt: proof.createdAt.toISOString(),
})

export async function countSearchResults(query: string, recruiterId?: string | null) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return 0
  }

  const [users, companies, jobs, proofs] = await Promise.all([
    prisma.user.findMany({
      include: {
        proofs: {
          include: {
            endorsements: true,
          },
        },
      },
      take: 60,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.findMany({
      take: 20,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.jobPost.findMany({
      include: {
        company: true,
        applications: recruiterId
          ? {
              where: { applicantId: recruiterId },
              select: { status: true },
              take: 1,
            }
          : false,
      },
      take: 40,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.proof.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        endorsements: true,
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const candidateCount = users
    .map((user) => {
      const proofs = user.proofs.map(toProofDto)
      const reputation = calculateReputation(proofs)
      return {
        username: user.username,
        primaryProfession: getPrimaryProfession(proofs),
        strongestProof: getStrongestProof(proofs),
        topTags: reputation.tagFrequency.slice(0, 4).map((item) => item.tag),
        proofCount: reputation.totalProofs,
      }
    })
    .filter((candidate) => candidate.proofCount > 0)
    .filter((candidate) =>
      [
        candidate.username,
        candidate.primaryProfession ?? '',
        candidate.strongestProof?.title ?? '',
        ...candidate.topTags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ).length

  const companyCount = companies.filter((company) =>
    [company.name, company.tagline ?? '', company.description ?? '', company.industry ?? '', company.location ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ).length

  const jobCount = jobs.filter((job) =>
    [
      job.title,
      job.description,
      job.profession,
      ...(job.company ? [job.company.name, job.company.tagline ?? '', job.company.industry ?? ''] : []),
      ...parseStringArray(job.targetTags),
      ...parseStringArray(job.preferredProofTypes),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ).length

  const proofCount = proofs.filter((proof) =>
    [proof.title, proof.description, proof.outcomeSummary ?? '', proof.profession, proof.proofType, ...parseTags(proof.tags)]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  ).length

  const skillNames = new Set<string>()
  proofs.forEach((proof) => {
    parseTags(proof.tags).forEach((tag) => {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        skillNames.add(tag)
      }
    })
  })

  return candidateCount + companyCount + jobCount + proofCount + skillNames.size
}

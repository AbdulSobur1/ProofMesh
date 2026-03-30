import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { calculateReputation } from '@/lib/services/reputation'
import { getPrimaryProfession, getStrongestProof } from '@/lib/services/discovery'
import { parseStringArray, toJobPostDto } from '@/lib/services/jobs'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { DiscoveryCandidate, type JobApplicationStatus, PeerVerification, Proof, type SearchProofResult, SearchResultsResponse, SearchSkillResult } from '@/lib/types'

const includesQuery = (values: Array<string | null | undefined>, query: string) =>
  values
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query)

const scoreQueryMatch = (values: Array<string | null | undefined>, query: string) => {
  let score = 0
  values.forEach((value) => {
    const normalized = value?.toLowerCase().trim()
    if (!normalized) return
    if (normalized === query) {
      score += 20
    } else if (normalized.startsWith(query)) {
      score += 12
    } else if (normalized.includes(query)) {
      score += 6
    }
  })
  return score
}

const toEndorsement = (endorsement: {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  relationship: endorsement.relationship as PeerVerification['relationship'],
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

const toProof = (proof: {
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
  endorsements: proof.endorsements.map(toEndorsement),
  endorsementCount: proof.endorsements.length,
  createdAt: proof.createdAt.toISOString(),
})

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const recruiterId = token?.sub ?? null
  const { searchParams } = new URL(request.url)
  const rawQuery = (searchParams.get('q') ?? '').trim()
  const query = rawQuery.toLowerCase()
  const resultType = searchParams.get('resultType') ?? 'all'
  const proofTypeFilter = (searchParams.get('proofType') ?? '').trim().toLowerCase()
  const sourceCategoryFilter = (searchParams.get('sourceCategory') ?? '').trim().toLowerCase()
  const verifiedOnly = searchParams.get('verifiedOnly') === 'true'
  const minConfidence = Number(searchParams.get('minConfidence') ?? '0')

  if (!query) {
    const empty: SearchResultsResponse = {
      query: '',
      candidates: [],
      companies: [],
      jobs: [],
      proofs: [],
      skills: [],
    }
    return NextResponse.json(empty)
  }

  const [users, companies, jobs, proofs] = await Promise.all([
    prisma.user.findMany({
      include: {
        proofs: {
          orderBy: { createdAt: 'desc' },
          include: {
            endorsements: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        candidateShortlists: recruiterId
          ? {
              where: {
                recruiterId,
              },
              take: 1,
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.company.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.jobPost.findMany({
      include: {
        company: true,
        applications: recruiterId
          ? {
              where: {
                applicantId: recruiterId,
              },
              select: {
                status: true,
              },
              take: 1,
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.proof.findMany({
      include: {
        user: {
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
        endorsements: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
  ])

  const candidates: DiscoveryCandidate[] = users
    .map((user) => {
      const mappedProofs = user.proofs.map(toProof)
      const reputation = calculateReputation(mappedProofs)
      const shortlistRecord = Array.isArray((user as { candidateShortlists?: Array<{ createdAt: Date }> }).candidateShortlists)
        ? (user as { candidateShortlists?: Array<{ createdAt: Date }> }).candidateShortlists?.[0] ?? null
        : null

      return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        primaryProfession: getPrimaryProfession(mappedProofs),
        reputation,
        topTags: reputation.tagFrequency.slice(0, 4).map((item) => item.tag),
        proofTypes: Array.from(new Set(mappedProofs.map((proof) => proof.proofType))),
        strongestProof: getStrongestProof(mappedProofs),
        isSaved: Boolean(shortlistRecord),
        savedAt: shortlistRecord?.createdAt?.toISOString() ?? null,
        _matchScore:
          scoreQueryMatch(
            [
              user.username,
              getPrimaryProfession(mappedProofs) ?? '',
              getStrongestProof(mappedProofs)?.title ?? '',
              ...reputation.tagFrequency.slice(0, 4).map((item) => item.tag),
            ],
            query
          ) +
          Math.round(reputation.averageConfidence / 5) +
          reputation.verifiedProofs * 2,
      }
    })
    .filter((candidate) => candidate.reputation.totalProofs > 0)
    .filter((candidate) => includesQuery([candidate.username, candidate.primaryProfession ?? '', candidate.strongestProof?.title ?? '', ...candidate.topTags], query))
    .sort((left, right) => (right as typeof left & { _matchScore: number })._matchScore - (left as typeof left & { _matchScore: number })._matchScore)
    .slice(0, 8)
    .map(({ _matchScore: _ignored, ...candidate }) => candidate as DiscoveryCandidate)

  const companyResults = companies
    .filter((company) => includesQuery([company.name, company.tagline ?? '', company.description ?? '', company.industry ?? '', company.location ?? ''], query))
    .map((company) => ({
      company: {
        id: company.id,
        slug: company.slug,
        name: company.name,
        tagline: company.tagline,
        description: company.description,
        websiteUrl: company.websiteUrl,
        location: company.location,
        logoUrl: company.logoUrl,
        industry: company.industry,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      },
      score:
        scoreQueryMatch([company.name, company.tagline ?? '', company.industry ?? '', company.location ?? ''], query) +
        (company.description?.toLowerCase().includes(query) ? 4 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.company)

  const jobResults = jobs
    .filter((job) => includesQuery([
      job.title,
      job.description,
      job.profession,
      ...(job.company ? [job.company.name, job.company.tagline ?? '', job.company.industry ?? ''] : []),
      ...parseStringArray(job.targetTags),
      ...parseStringArray(job.preferredProofTypes),
    ], query))
    .map((job) => {
      const application = Array.isArray((job as { applications?: Array<{ status: string }> }).applications)
        ? (job as { applications?: Array<{ status: string }> }).applications?.[0] ?? null
        : null

      return {
        job: {
          ...toJobPostDto(job),
          hasApplied: Boolean(application),
          applicationStatus: (application?.status as JobApplicationStatus | undefined) ?? null,
        },
        score:
          scoreQueryMatch([
            job.title,
            job.profession,
            job.company?.name ?? '',
            ...parseStringArray(job.targetTags),
            ...parseStringArray(job.preferredProofTypes),
          ], query) + Math.round(job.minScore),
      }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.job)

  const proofResults = proofs
    .map((proof) => {
      const tags = parseTags(proof.tags)
      return {
        id: proof.id,
        title: proof.title,
        description: proof.description,
        sourceCategory: (proof.sourceCategory ?? 'general') as Proof['sourceCategory'],
        profession: proof.profession,
        proofType: proof.proofType,
        score: proof.score,
        tags,
        verificationStatus: proof.verificationStatus,
        verificationConfidence: proof.verificationConfidence,
        endorsementCount: proof.endorsements.length,
        createdAt: proof.createdAt.toISOString(),
        owner: proof.user,
        searchBlob: [proof.title, proof.description, proof.outcomeSummary ?? '', proof.profession, proof.proofType, ...tags].join(' ').toLowerCase(),
        matchScore:
          scoreQueryMatch([proof.title, proof.profession, proof.proofType, ...tags], query) +
          Math.round(proof.verificationConfidence / 10) +
          Math.round(proof.score) +
          proof.endorsements.length * 2,
      }
    })
    .filter((proof) => proof.searchBlob.includes(query))
    .filter((proof) => !proofTypeFilter || proof.proofType.toLowerCase() === proofTypeFilter)
    .filter((proof) => !sourceCategoryFilter || (proof.sourceCategory ?? 'general').toLowerCase() === sourceCategoryFilter)
    .filter((proof) => !verifiedOnly || proof.verificationStatus !== 'needs_review')
    .filter((proof) => proof.verificationConfidence >= minConfidence)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, 8)
    .map(({ searchBlob: _searchBlob, matchScore: _matchScore, ...proof }) => ({
      ...proof,
      sourceCategory: proof.sourceCategory ?? 'general',
    }) satisfies SearchProofResult)

  const skillMap = new Map<string, { proofCount: number; candidateIds: Set<string>; candidateNames: Set<string> }>()
  proofs.forEach((proof) => {
    parseTags(proof.tags).forEach((tag) => {
      if (!tag.toLowerCase().includes(query)) {
        return
      }

      const entry = skillMap.get(tag) ?? {
        proofCount: 0,
        candidateIds: new Set<string>(),
        candidateNames: new Set<string>(),
      }

      entry.proofCount += 1
      entry.candidateIds.add(proof.user.id)
      entry.candidateNames.add(proof.user.displayName || proof.user.username)
      skillMap.set(tag, entry)
    })
  })

  const skills: SearchSkillResult[] = Array.from(skillMap.entries())
    .map(([name, value]) => ({
      name,
      proofCount: value.proofCount,
      candidateCount: value.candidateIds.size,
      topCandidates: Array.from(value.candidateNames).slice(0, 3),
    }))
    .sort((a, b) => b.candidateCount - a.candidateCount || b.proofCount - a.proofCount)
    .slice(0, 8)

  const response: SearchResultsResponse = {
    query: rawQuery,
    candidates: resultType === 'all' || resultType === 'people' ? candidates : [],
    companies: resultType === 'all' || resultType === 'companies' ? companyResults : [],
    jobs: resultType === 'all' || resultType === 'jobs' ? jobResults : [],
    proofs: resultType === 'all' || resultType === 'proofs' ? proofResults : [],
    skills: resultType === 'all' || resultType === 'skills' ? skills : [],
  }

  return NextResponse.json(response)
}

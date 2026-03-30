import { ROLE_PROFILES, type RoleSlug } from '@/lib/role-taxonomy'
import { DiscoveryCandidate, JobPost, RoleMatch } from '@/lib/types'

const buildMatches = (
  config: {
    profession: string
    targetTags: string[]
    preferredProofTypes: string[]
    minScore: number
  },
  candidates: DiscoveryCandidate[]
): RoleMatch[] => {
  return candidates
    .map((candidate) => {
      const matchedTags = config.targetTags.filter((tag) => candidate.topTags.includes(tag))
      const matchedProofTypes = config.preferredProofTypes.filter((proofType) => candidate.proofTypes.includes(proofType))

      const professionScore = candidate.primaryProfession === config.profession ? 24 : 0
      const skillTagScore = Math.min(28, matchedTags.length * 7)
      const proofTypeScore = Math.min(14, matchedProofTypes.length * 7)
      const trustScore = Math.min(18, Math.round(candidate.reputation.averageConfidence / 6) + candidate.reputation.verifiedProofs * 2)
      const proofQualityScore = Math.min(16, Math.round(candidate.reputation.averageScore * 1.6))

      const matchScore = Math.min(100, professionScore + skillTagScore + proofTypeScore + trustScore + proofQualityScore)

      return {
        candidate,
        matchScore,
        matchedTags,
        matchedProofTypes,
        breakdown: {
          profession: professionScore,
          skillTags: skillTagScore,
          proofTypes: proofTypeScore,
          trust: trustScore,
          proofQuality: proofQualityScore,
        },
      }
    })
    .filter((match) => match.candidate.reputation.averageScore >= config.minScore)
    .sort((a, b) => b.matchScore - a.matchScore || b.candidate.reputation.averageConfidence - a.candidate.reputation.averageConfidence)
}

export const buildRoleMatches = (roleSlug: RoleSlug, candidates: DiscoveryCandidate[]): RoleMatch[] => {
  const role = ROLE_PROFILES[roleSlug]
  return buildMatches(role, candidates)
}

export const buildJobMatches = (job: JobPost, candidates: DiscoveryCandidate[]): RoleMatch[] =>
  buildMatches(job, candidates)

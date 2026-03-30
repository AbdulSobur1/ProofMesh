import { DiscoveryCandidate, DiscoverySortMode, Proof } from '@/lib/types'

export const sortCandidates = (candidates: DiscoveryCandidate[], sortMode: DiscoverySortMode) => {
  const copy = [...candidates]

  switch (sortMode) {
    case 'score':
      return copy.sort((a, b) => b.reputation.averageScore - a.reputation.averageScore || b.reputation.averageConfidence - a.reputation.averageConfidence)
    case 'proofs':
      return copy.sort((a, b) => b.reputation.totalProofs - a.reputation.totalProofs || b.reputation.averageScore - a.reputation.averageScore)
    case 'endorsements':
      return copy.sort((a, b) => b.reputation.endorsementCount - a.reputation.endorsementCount || b.reputation.averageConfidence - a.reputation.averageConfidence)
    case 'trust':
    default:
      return copy.sort((a, b) => b.reputation.averageConfidence - a.reputation.averageConfidence || b.reputation.verifiedProofs - a.reputation.verifiedProofs || b.reputation.averageScore - a.reputation.averageScore)
  }
}

export const filterCandidates = (
  candidates: DiscoveryCandidate[],
  options: {
    query: string
    profession: string
    minScore: number
    verifiedOnly: boolean
    minEndorsements?: number
    topTag?: string
    proofType?: string
  }
) => {
  const normalizedQuery = options.query.trim().toLowerCase()
  const normalizedTopTag = (options.topTag ?? '').trim().toLowerCase()
  const normalizedProofType = (options.proofType ?? '').trim().toLowerCase()

  return candidates.filter((candidate) => {
    const searchableValues = [
      candidate.username,
      candidate.primaryProfession ?? '',
      candidate.strongestProof?.title ?? '',
      ...candidate.topTags,
    ]

    const matchesQuery =
      !normalizedQuery ||
      searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery))

    const matchesProfession = !options.profession || candidate.primaryProfession === options.profession
    const matchesScore = candidate.reputation.averageScore >= options.minScore
    const matchesVerified = !options.verifiedOnly || candidate.reputation.verifiedProofs > 0
    const matchesEndorsements = candidate.reputation.endorsementCount >= (options.minEndorsements ?? 0)
    const matchesTopTag = !normalizedTopTag || candidate.topTags.some((tag) => tag.toLowerCase().includes(normalizedTopTag))
    const matchesProofType =
      !normalizedProofType || candidate.proofTypes.some((proofType) => proofType.toLowerCase() === normalizedProofType)

    return matchesQuery && matchesProfession && matchesScore && matchesVerified && matchesEndorsements && matchesTopTag && matchesProofType
  })
}

export const getPrimaryProfession = (proofs: Proof[]) => {
  if (proofs.length === 0) return null

  const counts = new Map<string, number>()
  proofs.forEach((proof) => {
    counts.set(proof.profession, (counts.get(proof.profession) ?? 0) + 1)
  })

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export const getStrongestProof = (proofs: Proof[]) => {
  if (proofs.length === 0) return null

  const strongest = [...proofs].sort((a, b) => b.score - a.score || +new Date(b.createdAt) - +new Date(a.createdAt))[0]

  return strongest
    ? {
        id: strongest.id,
        title: strongest.title,
        score: strongest.score,
      }
    : null
}

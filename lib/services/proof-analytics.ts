import { Proof, ProofSortMode } from '@/lib/types'

export const sortProofs = (proofs: Proof[], sortMode: ProofSortMode) => {
  const copy = [...proofs]

  switch (sortMode) {
    case 'highest':
      return copy.sort((a, b) => b.score - a.score || +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'oldest':
      return copy.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    case 'lowest':
      return copy.sort((a, b) => a.score - b.score || +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'newest':
    default:
      return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }
}

export const filterProofs = (
  proofs: Proof[],
  query: string,
  selectedTag: string | null,
  minimumScore: number
) => {
  const normalizedQuery = query.trim().toLowerCase()

  return proofs.filter((proof) => {
    const matchesQuery =
      !normalizedQuery ||
      [proof.title, proof.description, ...(proof.tags ?? [])].some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
      )

    const matchesTag = !selectedTag || proof.tags.includes(selectedTag)
    const matchesScore = proof.score >= minimumScore

    return matchesQuery && matchesTag && matchesScore
  })
}

export const getTimeline = (proofs: Proof[]) =>
  [...proofs]
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((proof) => ({
      date: new Date(proof.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      score: proof.score,
      title: proof.title,
      createdAt: proof.createdAt,
    }))

export const getProofCountsByTag = (proofs: Proof[]) => {
  const map = new Map<string, number>()

  proofs.forEach((proof) => {
    proof.tags.forEach((tag) => {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    })
  })

  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

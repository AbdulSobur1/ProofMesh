import { Proof } from '@/lib/types'

export const calculateReputation = (proofs: Proof[]) => {
  const totalProofs = proofs.length
  const totalScore = proofs.reduce((sum, proof) => sum + proof.score, 0)
  const averageScore = totalProofs === 0 ? 0 : Math.round((totalScore / totalProofs) * 10) / 10

  const tagMap = new Map<string, number>()
  proofs.forEach((proof) => {
    proof.tags.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    })
  })

  const tagFrequency = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)

  return {
    averageScore,
    totalProofs,
    tagFrequency,
  }
}

import { Proof, Reputation } from '@/lib/types'
import { averageConfidence, countEndorsements, countVerifiedProofs } from '@/lib/services/verification'
import { getEndorsementWeight } from '@/lib/services/trust'

export const calculateReputation = (proofs: Proof[]): Reputation => {
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

  const weightedEndorsementCount = Math.round(
    proofs.reduce(
      (sum, proof) =>
        sum +
        proof.endorsements.reduce(
          (endorsementSum, endorsement) =>
            endorsementSum +
            getEndorsementWeight({
              verifiedReviewer: endorsement.verifiedReviewer,
              reviewerTrustLevel: endorsement.reviewerTrustLevel,
            }),
          0
        ),
      0
    ) * 10
  ) / 10

  return {
    averageScore,
    totalProofs,
    tagFrequency,
    verifiedProofs: countVerifiedProofs(proofs),
    averageConfidence: averageConfidence(proofs),
    endorsementCount: weightedEndorsementCount || countEndorsements(proofs),
  }
}

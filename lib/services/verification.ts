import { type PeerVerification, type Proof } from '@/lib/types'
import { getEndorsementWeight, normalizeTrustLevel } from '@/lib/services/trust'

export type VerificationStatus = 'verified' | 'strong' | 'needs_review'
export type VerificationStrength = 'low' | 'medium' | 'high'

export type VerificationSignal = {
  label: string
  strength: VerificationStrength
}

const signal = (label: string, strength: VerificationStrength): VerificationSignal => ({
  label,
  strength,
})

const relationshipBoosts: Record<string, number> = {
  peer: 8,
  collaborator: 10,
  manager: 12,
  client: 14,
}

export const serializeVerificationSignals = (signals: VerificationSignal[]) => JSON.stringify(signals)

export const parseVerificationSignals = (value: string | null | undefined): VerificationSignal[] => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as VerificationSignal[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        typeof item?.label === 'string' &&
        ['low', 'medium', 'high'].includes(String(item?.strength))
    )
  } catch {
    return []
  }
}

export const getVerificationMeta = (status: string) => {
  if (status === 'verified') {
    return {
      label: 'Verified',
      tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    }
  }
  if (status === 'strong') {
    return {
      label: 'Strong Signal',
      tone: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
    }
  }
  return {
    label: 'Needs Review',
    tone: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  }
}

export const evaluateVerification = (input: {
  score: number
  link?: string | null
  evidenceCount?: number
  outcomeSummary?: string | null
  tags: string[]
  endorsements?: Array<Pick<PeerVerification, 'relationship' | 'message' | 'verifierCompany' | 'verifiedReviewer' | 'reviewerTrustLevel'>>
}): {
  status: VerificationStatus
  confidence: number
  signals: VerificationSignal[]
  verifiedAt: Date | null
} => {
  const signals: VerificationSignal[] = []
  let confidence = 35

  if (input.link) {
    confidence += 20
    signals.push(signal('Linked external evidence', 'high'))
  }

  if ((input.evidenceCount ?? 0) >= 2) {
    confidence += 12
    signals.push(signal('Multiple supporting evidence links', 'high'))
  } else if ((input.evidenceCount ?? 0) === 1) {
    confidence += 6
    signals.push(signal('Supporting evidence attached', 'medium'))
  }

  if ((input.outcomeSummary ?? '').trim().length >= 20) {
    confidence += 15
    signals.push(signal('Clear outcome summary', 'medium'))
  }

  if (input.tags.length >= 3) {
    confidence += 10
    signals.push(signal('Rich skill tagging', 'medium'))
  }

  if (input.score >= 9) {
    confidence += 20
    signals.push(signal('Exceptional evaluation score', 'high'))
  } else if (input.score >= 8) {
    confidence += 15
    signals.push(signal('High evaluation score', 'high'))
  } else if (input.score >= 7) {
    confidence += 10
    signals.push(signal('Solid evaluation score', 'medium'))
  }

  const endorsements = input.endorsements ?? []
  const relationshipCounts = new Map<string, number>()

  endorsements.forEach((endorsement) => {
    const normalizedRelationship = endorsement.relationship.toLowerCase()
    relationshipCounts.set(normalizedRelationship, (relationshipCounts.get(normalizedRelationship) ?? 0) + 1)
    confidence += relationshipBoosts[normalizedRelationship] ?? 6
    confidence += Math.round((getEndorsementWeight({
      verifiedReviewer: endorsement.verifiedReviewer,
      reviewerTrustLevel: endorsement.reviewerTrustLevel,
    }) - 1) * 6)

    if ((endorsement.message ?? '').trim().length >= 50) {
      confidence += 4
    }

    if (endorsement.verifiedReviewer) {
      signals.push(signal('Identity-confirmed verifier', 'high'))
    }

    const reviewerTrustLevel = normalizeTrustLevel(endorsement.reviewerTrustLevel)
    if (reviewerTrustLevel === 'verified') {
      signals.push(signal('Verified reviewer trust level', 'high'))
    } else if (reviewerTrustLevel === 'elevated') {
      signals.push(signal('Elevated reviewer trust level', 'medium'))
    }
  })

  relationshipCounts.forEach((count, relationship) => {
    const label = relationship === 'client'
      ? 'Client-endorsed'
      : relationship === 'manager'
        ? 'Manager-endorsed'
        : relationship === 'collaborator'
          ? 'Collaborator-endorsed'
          : 'Peer-endorsed'

    signals.push(signal(count > 1 ? `${label} x${count}` : label, count > 1 ? 'high' : 'medium'))
  })

  if (endorsements.length >= 3) {
    confidence += 8
    signals.push(signal('Multiple independent endorsements', 'high'))
  }

  const boundedConfidence = Math.max(20, Math.min(98, confidence))

  if (boundedConfidence >= 85) {
    return {
      status: 'verified',
      confidence: boundedConfidence,
      signals,
      verifiedAt: new Date(),
    }
  }

  if (boundedConfidence >= 65) {
    return {
      status: 'strong',
      confidence: boundedConfidence,
      signals,
      verifiedAt: new Date(),
    }
  }

  return {
    status: 'needs_review',
    confidence: boundedConfidence,
    signals,
    verifiedAt: null,
  }
}

export const countVerifiedProofs = (proofs: Proof[]) =>
  proofs.filter((proof) => proof.verificationStatus !== 'needs_review').length

export const averageConfidence = (proofs: Proof[]) => {
  if (proofs.length === 0) return 0
  const total = proofs.reduce((sum, proof) => sum + proof.verificationConfidence, 0)
  return Math.round((total / proofs.length) * 10) / 10
}

export const countEndorsements = (proofs: Proof[]) =>
  proofs.reduce((sum, proof) => sum + proof.endorsementCount, 0)

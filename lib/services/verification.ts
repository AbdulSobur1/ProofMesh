import { type Proof } from '@/lib/types'

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
  outcomeSummary?: string | null
  tags: string[]
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

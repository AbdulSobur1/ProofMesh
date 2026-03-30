export type TrustLevel = 'standard' | 'elevated' | 'verified'

const TRUST_LEVEL_WEIGHTS: Record<TrustLevel, number> = {
  standard: 1,
  elevated: 1.35,
  verified: 1.75,
}

export const normalizeTrustLevel = (value: string | null | undefined): TrustLevel => {
  if (value === 'verified' || value === 'elevated') {
    return value
  }

  return 'standard'
}

export const getTrustWeight = (value: string | null | undefined) => TRUST_LEVEL_WEIGHTS[normalizeTrustLevel(value)]

export const getEndorsementWeight = (input: {
  verifiedReviewer?: boolean
  reviewerTrustLevel?: string | null
}) => {
  const reviewerWeight = getTrustWeight(input.reviewerTrustLevel)
  const verificationBonus = input.verifiedReviewer ? 0.5 : 0

  return reviewerWeight + verificationBonus
}

export const getTrustLabel = (value: string | null | undefined) => {
  const level = normalizeTrustLevel(value)

  if (level === 'verified') {
    return 'Verified identity'
  }

  if (level === 'elevated') {
    return 'Elevated trust'
  }

  return 'Standard trust'
}

export const deriveTrustLevel = (input: {
  identityVerifiedAt?: Date | string | null
  proofCount: number
  acceptedConnectionCount: number
  endorsementCount: number
}): TrustLevel => {
  if (input.identityVerifiedAt) {
    return 'verified'
  }

  if (
    input.proofCount >= 3 &&
    input.acceptedConnectionCount >= 2 &&
    input.endorsementCount >= 2
  ) {
    return 'elevated'
  }

  return 'standard'
}

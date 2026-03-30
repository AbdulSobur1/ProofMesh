import { parseTags, serializeTags } from '@/lib/services/tags'

type RiskInput = {
  title: string
  description: string
  link?: string | null
  evidenceCount?: number
  outcomeSummary?: string | null
  score: number
  tags: string[]
  existingProofCount: number
}

export type RiskAssessment = {
  score: number
  flags: string[]
  moderationStatus: 'active' | 'under_review'
}

const SUSPICIOUS_KEYWORDS = [
  'guaranteed',
  'secret hack',
  'overnight',
  '100x',
  'million dollars',
  'fake',
  'cheat',
  'bypass',
]

export const assessProofRisk = (input: RiskInput): RiskAssessment => {
  let score = 0
  const flags: string[] = []

  const combinedText = [input.title, input.description, input.outcomeSummary ?? ''].join(' ').toLowerCase()

  if (input.description.trim().length < 40) {
    score += 18
    flags.push('Very short description')
  }

  if (!input.link && (input.evidenceCount ?? 0) === 0) {
    score += 12
    flags.push('No supporting evidence provided')
  }

  if (input.tags.length === 0) {
    score += 10
    flags.push('No extracted skill tags')
  }

  if (input.score >= 9 && !input.link && (input.evidenceCount ?? 0) === 0) {
    score += 22
    flags.push('High AI score without external evidence')
  }

  if ((input.evidenceCount ?? 0) >= 2) {
    score = Math.max(0, score - 8)
  }

  if (input.existingProofCount === 0 && input.score >= 9) {
    score += 14
    flags.push('Very strong first proof for a new account')
  }

  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((keyword) => combinedText.includes(keyword))
  if (matchedKeywords.length > 0) {
    score += 8 * matchedKeywords.length
    flags.push(`Suspicious claims: ${matchedKeywords.slice(0, 3).join(', ')}`)
  }

  const exclamationCount = (input.description.match(/!/g) ?? []).length
  if (exclamationCount >= 4) {
    score += 8
    flags.push('Overly promotional language')
  }

  if (input.tags.length > 0) {
    const normalized = serializeTags(input.tags)
    const reparsed = parseTags(normalized)
    if (reparsed.length !== input.tags.length) {
      score += 5
      flags.push('Tag serialization inconsistency')
    }
  }

  const normalizedScore = Math.min(100, score)

  return {
    score: normalizedScore,
    flags,
    moderationStatus: normalizedScore >= 35 ? 'under_review' : 'active',
  }
}

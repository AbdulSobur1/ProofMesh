export type ProofEvidenceType =
  | 'repository'
  | 'portfolio'
  | 'case_study'
  | 'document'
  | 'presentation'
  | 'video'
  | 'dataset'
  | 'other'

export type ProofSourceCategory =
  | 'general'
  | 'github'
  | 'portfolio'
  | 'case_study'
  | 'document'
  | 'presentation'

export type ProofEvidenceItem = {
  label: string
  url: string
  type: ProofEvidenceType
}

const EVIDENCE_TYPES = new Set<ProofEvidenceType>([
  'repository',
  'portfolio',
  'case_study',
  'document',
  'presentation',
  'video',
  'dataset',
  'other',
])

export const parseEvidenceItems = (value: string | null | undefined): ProofEvidenceItem[] => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as ProofEvidenceItem[]
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item) =>
        typeof item?.label === 'string' &&
        item.label.trim().length > 0 &&
        typeof item?.url === 'string' &&
        item.url.trim().length > 0 &&
        EVIDENCE_TYPES.has(item.type)
    )
  } catch {
    return []
  }
}

export const serializeEvidenceItems = (items: ProofEvidenceItem[]) =>
  JSON.stringify(
    items.map((item) => ({
      label: item.label.trim(),
      url: item.url.trim(),
      type: item.type,
    }))
  )

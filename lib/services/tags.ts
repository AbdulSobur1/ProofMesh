export const serializeTags = (tags: string[]) => JSON.stringify(tags)

export const parseTags = (value: string | string[] | null | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : []
  } catch {
    return []
  }
}

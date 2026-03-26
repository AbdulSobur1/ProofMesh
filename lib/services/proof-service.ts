import { randomUUID } from 'crypto'

export const generateId = () => randomUUID()

export const generateTxHash = () => {
  const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  return `0x${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

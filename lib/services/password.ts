import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export const verifyPassword = (password: string, storedHash: string) => {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false

  const hashBuffer = Buffer.from(hash, 'hex')
  const computed = scryptSync(password, salt, 64)
  return hashBuffer.length === computed.length && timingSafeEqual(hashBuffer, computed)
}

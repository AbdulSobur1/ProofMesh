import { createHmac, timingSafeEqual } from 'crypto'

export interface SessionPayload {
  username: string
  exp: number
}

const secret = () => process.env.AUTH_SECRET ?? 'proofmesh-dev-secret'

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString('base64url')

const base64UrlDecode = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8')

const sign = (value: string) =>
  createHmac('sha256', secret()).update(value).digest('base64url')

export const createSessionToken = (payload: SessionPayload) => {
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(body)
  return `${body}.${signature}`
}

export const verifySessionToken = (token: string): SessionPayload | null => {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(signature)

  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload
    if (!payload.username || typeof payload.exp !== 'number') {
      return null
    }
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

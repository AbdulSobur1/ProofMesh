import { createHmac, randomInt, timingSafeEqual } from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? 'proofmesh-dev-secret'
const TOKEN_TTL_MS = 1000 * 60 * 10

export type EmailChallengePurpose = 'login' | 'signup' | 'reset'

type ChallengePayload = {
  email: string
  purpose: EmailChallengePurpose
  codeHash: string
  expiresAt: number
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string) {
  return createHmac('sha256', SECRET).update(value).digest('base64url')
}

function hashCode(code: string) {
  return createHmac('sha256', SECRET).update(`email-code:${code}`).digest('base64url')
}

export function generateEmailVerificationChallenge(email: string, purpose: EmailChallengePurpose) {
  const code = String(randomInt(100000, 999999))
  const payload: ChallengePayload = {
    email: email.toLowerCase(),
    purpose,
    codeHash: hashCode(code),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  }

  const encoded = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encoded)

  return {
    code,
    token: `${encoded}.${signature}`,
    expiresAt: payload.expiresAt,
  }
}

export function verifyEmailVerificationChallenge(
  token: string,
  email: string,
  code: string,
  purpose: EmailChallengePurpose,
) {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) {
    return { ok: false as const, reason: 'invalid_token' as const }
  }

  const expectedSignature = sign(encoded)
  const sigA = Buffer.from(signature)
  const sigB = Buffer.from(expectedSignature)

  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
    return { ok: false as const, reason: 'invalid_token' as const }
  }

  const payload = JSON.parse(base64UrlDecode(encoded)) as ChallengePayload

  if (payload.email !== email.toLowerCase()) {
    return { ok: false as const, reason: 'email_mismatch' as const }
  }

  if (payload.purpose !== purpose) {
    return { ok: false as const, reason: 'purpose_mismatch' as const }
  }

  if (payload.expiresAt < Date.now()) {
    return { ok: false as const, reason: 'expired' as const }
  }

  if (payload.codeHash !== hashCode(code)) {
    return { ok: false as const, reason: 'invalid_code' as const }
  }

  return { ok: true as const }
}

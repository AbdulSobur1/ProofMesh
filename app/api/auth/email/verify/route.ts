import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/services/password'
import { verifyEmailVerificationChallenge } from '@/lib/services/email-verification'

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, code, password, confirmPassword } = schema.parse(body)

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const challengeToken = cookieStore.get('proofmesh_email_challenge')?.value
    if (!challengeToken) {
      return NextResponse.json({ error: 'Verification session expired' }, { status: 400 })
    }

    const verification = verifyEmailVerificationChallenge(challengeToken, email, code, 'signup')
    if (!verification.ok) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    const username = email.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 })
    }

    await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create account'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

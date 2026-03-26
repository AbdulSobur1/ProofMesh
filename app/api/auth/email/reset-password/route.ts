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
  const body = await request.json()
  const { email, code, password, confirmPassword } = schema.parse(body)

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const challengeToken = cookieStore.get('proofmesh_email_challenge')?.value
  if (!challengeToken) {
    return NextResponse.json({ error: 'Reset session expired' }, { status: 400 })
  }

  const verification = verifyEmailVerificationChallenge(challengeToken, email, code, 'reset')
  if (!verification.ok) {
    return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { username: email.toLowerCase() },
  })

  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
    },
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('proofmesh_email_challenge')
  return response
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateEmailVerificationChallenge, type EmailChallengePurpose } from '@/lib/services/email-verification'
import { sendVerificationEmail } from '@/lib/services/email'

const schema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'signup', 'reset']),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, purpose } = schema.parse(body)
    const challenge = generateEmailVerificationChallenge(email, purpose as EmailChallengePurpose)
    const delivery = await sendVerificationEmail({ email, code: challenge.code })

    const response = NextResponse.json({
      ok: true,
      delivered: delivery.delivered,
      devCode: process.env.NODE_ENV !== 'production' ? challenge.code : undefined,
    })

    response.cookies.set({
      name: 'proofmesh_email_challenge',
      value: challenge.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to send verification code'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

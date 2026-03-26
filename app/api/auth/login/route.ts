import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/services/password'
import { createSessionToken } from '@/lib/services/session'
import { SESSION_COOKIE } from '@/lib/auth'

const loginSchema = z.object({
  username: z.string().min(3).max(24).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(72),
}).refine((value) => Boolean(value.username || value.email), {
  message: 'Username or email is required',
  path: ['username'],
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = loginSchema.parse(body)

    const identifier = (input.email ?? input.username ?? '').trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { username: identifier },
    })

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = createSessionToken({
      username: user.username,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    })

    const response = NextResponse.json({
      user: { username: user.username, createdAt: user.createdAt.toISOString() },
    })

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}

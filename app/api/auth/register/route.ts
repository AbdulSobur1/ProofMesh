import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/services/password'
import { createSessionToken } from '@/lib/services/session'
import { SESSION_COOKIE } from '@/lib/auth'

const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, underscores, or dashes'),
  password: z.string().min(8).max(72),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { username: input.username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: {
        username: input.username,
        passwordHash: hashPassword(input.password),
      },
      select: { username: true, createdAt: true },
    })

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

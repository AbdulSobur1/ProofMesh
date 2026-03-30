import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80),
  headline: z.string().trim().max(140),
  bio: z.string().trim().max(600),
  location: z.string().trim().max(80),
  websiteUrl: z.string().trim().url().or(z.literal('')),
  avatarUrl: z.string().trim().url().or(z.literal('')),
  currentRole: z.string().trim().max(80),
  currentCompany: z.string().trim().max(80),
  yearsExperience: z.string().trim().regex(/^\d{0,2}$/),
})

const toProfile = (user: {
  id: string
  username: string
  displayName: string | null
  headline: string | null
  bio: string | null
  location: string | null
  websiteUrl: string | null
  avatarUrl: string | null
  currentRole: string | null
  currentCompany: string | null
  yearsExperience: number | null
  createdAt: Date
}) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  headline: user.headline,
  bio: user.bio,
  location: user.location,
  websiteUrl: user.websiteUrl,
  avatarUrl: user.avatarUrl,
  currentRole: user.currentRole,
  currentCompany: user.currentCompany,
  yearsExperience: user.yearsExperience,
  createdAt: user.createdAt.toISOString(),
})

async function getSignedInUser(request: Request) {
  const token = await getCurrentToken(request)
  const userId = token?.sub

  if (!userId) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: userId },
  })
}

export async function GET(request: Request) {
  const user = await getSignedInUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user: toProfile(user) })
}

export async function PATCH(request: Request) {
  const user = await getSignedInUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: input.displayName || null,
        headline: input.headline || null,
        bio: input.bio || null,
        location: input.location || null,
        websiteUrl: input.websiteUrl || null,
        avatarUrl: input.avatarUrl || null,
        currentRole: input.currentRole || null,
        currentCompany: input.currentCompany || null,
        yearsExperience: input.yearsExperience ? Number(input.yearsExperience) : null,
      },
    })

    return NextResponse.json({ user: toProfile(updatedUser) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid profile payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

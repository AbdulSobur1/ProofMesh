import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  tagline: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().max(1200).optional().default(''),
  websiteUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  location: z.string().trim().max(120).optional().default(''),
  logoUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  industry: z.string().trim().max(80).optional().default(''),
})

const toCompanyDto = (company: {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  websiteUrl: string | null
  location: string | null
  logoUrl: string | null
  industry: string | null
  createdAt: Date
  updatedAt: Date
}) => ({
  id: company.id,
  slug: company.slug,
  name: company.name,
  tagline: company.tagline,
  description: company.description,
  websiteUrl: company.websiteUrl,
  location: company.location,
  logoUrl: company.logoUrl,
  industry: company.industry,
  createdAt: company.createdAt.toISOString(),
  updatedAt: company.updatedAt.toISOString(),
})

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.companyMember.findFirst({
    where: {
      userId: currentUserId,
    },
    include: {
      company: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return NextResponse.json({
    company: membership ? toCompanyDto(membership.company) : null,
  })
}

export async function POST(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = companySchema.parse(body)

    const existing = await prisma.company.findUnique({
      where: { slug: input.slug },
    })

    if (existing) {
      return NextResponse.json({ error: 'That company slug is already in use' }, { status: 409 })
    }

    const company = await prisma.company.create({
      data: {
        name: input.name,
        slug: input.slug,
        tagline: input.tagline || null,
        description: input.description || null,
        websiteUrl: input.websiteUrl || null,
        location: input.location || null,
        logoUrl: input.logoUrl || null,
        industry: input.industry || null,
        ownerId: currentUserId,
        members: {
          create: {
            userId: currentUserId,
            role: 'admin',
          },
        },
      },
    })

    return NextResponse.json({ company: toCompanyDto(company) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid company payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

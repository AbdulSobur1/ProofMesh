import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { CompanyResponse } from '@/lib/types'
import { toJobPostDto } from '@/lib/services/jobs'

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
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

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    include: {
      jobs: {
        include: {
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!company) {
    return NextResponse.json({ company: null, jobs: [] }, { status: 404 })
  }

  const response: CompanyResponse = {
    company: toCompanyDto(company),
    jobs: company.jobs.map(toJobPostDto),
  }

  return NextResponse.json(response)
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.companyMember.findFirst({
    where: {
      userId: currentUserId,
      company: {
        slug: params.slug,
      },
    },
    include: {
      company: true,
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const input = updateSchema.parse(body)

    const company = await prisma.company.update({
      where: { id: membership.company.id },
      data: {
        name: input.name,
        tagline: input.tagline || null,
        description: input.description || null,
        websiteUrl: input.websiteUrl || null,
        location: input.location || null,
        logoUrl: input.logoUrl || null,
        industry: input.industry || null,
      },
    })

    return NextResponse.json({ company: toCompanyDto(company) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid company payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

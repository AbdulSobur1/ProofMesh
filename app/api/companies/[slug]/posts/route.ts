import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

const createCompanyPostSchema = z.object({
  body: z.string().trim().min(1).max(1200),
})

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

export async function POST(
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
    const input = createCompanyPostSchema.parse(body)

    const post = await prisma.companyPost.create({
      data: {
        companyId: membership.company.id,
        authorId: currentUserId,
        body: input.body,
      },
      include: {
        author: {
          select: authorSelect,
        },
      },
    })

    return NextResponse.json({
      post: {
        id: post.id,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        author: post.author,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid company post payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

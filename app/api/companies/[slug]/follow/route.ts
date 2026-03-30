import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  await prisma.companyFollow.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: currentUserId,
      },
    },
    create: {
      companyId: company.id,
      userId: currentUserId,
    },
    update: {},
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const follow = await prisma.companyFollow.findUnique({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: currentUserId,
      },
    },
  })

  if (follow) {
    await prisma.companyFollow.delete({
      where: { id: follow.id },
    })
  }

  return NextResponse.json({ ok: true })
}

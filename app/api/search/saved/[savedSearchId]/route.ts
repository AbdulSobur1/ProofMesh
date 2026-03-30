import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { countSearchResults } from '@/lib/services/search'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ savedSearchId: string }> }
) {
  const { savedSearchId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const search = await prisma.savedSearch.findFirst({
    where: {
      id: savedSearchId,
      ownerId: currentUserId,
    },
  })

  if (!search) {
    return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
  }

  const currentResultCount = await countSearchResults(search.query, currentUserId)
  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      lastResultCount: currentResultCount,
    },
  })

  return NextResponse.json({
    search: {
      id: updated.id,
      query: updated.query,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastResultCount: updated.lastResultCount,
      currentResultCount,
      newResultDelta: 0,
    },
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ savedSearchId: string }> }
) {
  const { savedSearchId } = await params
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const search = await prisma.savedSearch.findFirst({
    where: {
      id: savedSearchId,
      ownerId: currentUserId,
    },
  })

  if (!search) {
    return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
  }

  await prisma.savedSearch.delete({
    where: { id: search.id },
  })

  return NextResponse.json({ ok: true })
}

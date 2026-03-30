import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { countSearchResults } from '@/lib/services/search'
import { SavedSearchesResponse } from '@/lib/types'

const createSavedSearchSchema = z.object({
  query: z.string().trim().min(1).max(120),
})

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searches = await prisma.savedSearch.findMany({
    where: { ownerId: currentUserId },
    orderBy: { updatedAt: 'desc' },
  })

  const response: SavedSearchesResponse = {
    searches: await Promise.all(
      searches.map(async (search) => {
        const currentResultCount = await countSearchResults(search.query, currentUserId)
        return {
          id: search.id,
          query: search.query,
          createdAt: search.createdAt.toISOString(),
          updatedAt: search.updatedAt.toISOString(),
          lastResultCount: search.lastResultCount,
          currentResultCount,
          newResultDelta: Math.max(0, currentResultCount - search.lastResultCount),
        }
      })
    ),
  }

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = createSavedSearchSchema.parse(body)
    const currentResultCount = await countSearchResults(input.query, currentUserId)

    const search = await prisma.savedSearch.upsert({
      where: {
        ownerId_query: {
          ownerId: currentUserId,
          query: input.query,
        },
      },
      create: {
        ownerId: currentUserId,
        query: input.query,
        lastResultCount: currentResultCount,
      },
      update: {
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      search: {
        id: search.id,
        query: search.query,
        createdAt: search.createdAt.toISOString(),
        updatedAt: search.updatedAt.toISOString(),
        lastResultCount: search.lastResultCount,
        currentResultCount,
        newResultDelta: Math.max(0, currentResultCount - search.lastResultCount),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid saved search payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { countSearchResults } from '@/lib/services/search'
import { DashboardAnalyticsResponse } from '@/lib/types'

const recentViewerSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const currentUserId = token?.sub

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [profileViews, savedSearches] = await Promise.all([
    prisma.profileView.findMany({
      where: {
        profileUserId: currentUserId,
      },
      include: {
        viewerUser: {
          select: recentViewerSelect,
        },
      },
      orderBy: { lastViewedAt: 'desc' },
      take: 8,
    }),
    prisma.savedSearch.findMany({
      where: {
        ownerId: currentUserId,
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
  ])

  const searchesWithCounts = await Promise.all(
    savedSearches.map(async (search) => {
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
  )

  const response: DashboardAnalyticsResponse = {
    profileViews: {
      totalViews: profileViews.reduce((sum, entry) => sum + entry.viewCount, 0),
      uniqueViewers: profileViews.length,
      recentViewers: profileViews.map((entry) => entry.viewerUser),
    },
    savedSearches: searchesWithCounts,
  }

  return NextResponse.json(response)
}

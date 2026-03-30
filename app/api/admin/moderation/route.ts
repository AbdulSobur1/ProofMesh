import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { isAdminUsername } from '@/lib/services/admin'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { ModerationQueueResponse, ModerationTargetAccount, PeerVerification, Proof } from '@/lib/types'
import { getTrustWeight, normalizeTrustLevel } from '@/lib/services/trust'

const reporterSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

const authorSelect = reporterSelect
const accountSelect = {
  ...reporterSelect,
  trustLevel: true,
  identityVerifiedAt: true,
} as const

const toEndorsement = (endorsement: {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  verifiedReviewer: boolean
  reviewerTrustLevel: string
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
  verifiedReviewer: endorsement.verifiedReviewer,
  reviewerTrustLevel: endorsement.reviewerTrustLevel,
  relationship: endorsement.relationship as PeerVerification['relationship'],
  message: endorsement.message,
  createdAt: endorsement.createdAt.toISOString(),
})

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: string
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  riskScore: number
  riskFlags: string
  moderationStatus: string
  verifiedAt: Date | null
  createdAt: Date
  endorsements: Array<{
    id: string
    verifierName: string
    verifierRole: string | null
    verifierCompany: string | null
    verifiedReviewer: boolean
    reviewerTrustLevel: string
    relationship: string
    message: string
    createdAt: Date
  }>
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  profession: proof.profession,
  proofType: proof.proofType,
  outcomeSummary: proof.outcomeSummary,
  score: proof.score,
  feedback: proof.feedback,
  tags: parseTags(proof.tags),
  txHash: proof.txHash,
  verificationStatus: proof.verificationStatus,
  verificationConfidence: proof.verificationConfidence,
  verificationSignals: parseVerificationSignals(proof.verificationSignals),
  riskScore: proof.riskScore,
  riskFlags: parseTags(proof.riskFlags),
  moderationStatus: proof.moderationStatus as Proof['moderationStatus'],
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: proof.endorsements.map(toEndorsement),
  endorsementCount: proof.endorsements.length,
  createdAt: proof.createdAt.toISOString(),
})

export async function GET(request: Request) {
  const token = await getCurrentToken(request)
  const adminUser = token?.sub
    ? await prisma.user.findUnique({
        where: { id: token.sub },
        select: { username: true },
      })
    : null

  if (!token?.sub || !isAdminUsername(adminUser?.username ?? null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const reports = await prisma.report.findMany({
    include: {
      reporter: {
        select: reporterSelect,
      },
      actions: {
        include: {
          admin: {
            select: reporterSelect,
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const proofIds = reports.filter((report) => report.targetType === 'proof').map((report) => report.targetId)
  const postIds = reports.filter((report) => report.targetType === 'post').map((report) => report.targetId)

  const [proofs, posts] = await Promise.all([
    prisma.proof.findMany({
      where: { id: { in: proofIds } },
      include: {
        endorsements: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: accountSelect,
        },
      },
    }),
    prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        user: {
          select: accountSelect,
        },
        proof: {
          select: {
            id: true,
            title: true,
            description: true,
            link: true,
            profession: true,
            proofType: true,
            outcomeSummary: true,
            score: true,
            feedback: true,
            tags: true,
            txHash: true,
            verificationStatus: true,
            verificationConfidence: true,
            verificationSignals: true,
            riskScore: true,
            riskFlags: true,
            moderationStatus: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
        likes: { select: { userId: true } },
        comments: { select: { id: true } },
        reposts: { select: { id: true } },
      },
    }),
  ])

  const proofMap = new Map(proofs.map((proof) => [proof.id, toProof(proof)]))
  const proofOwnerMap = new Map(proofs.map((proof) => [proof.id, proof.user]))
  const postMap = new Map(
    posts.map((post) => [
      post.id,
      {
        id: post.id,
        body: post.body,
        postType: post.postType as 'text' | 'proof_share',
        createdAt: post.createdAt.toISOString(),
        author: post.user,
        proof: post.proof
          ? {
              ...toProof({ ...post.proof, endorsements: [] }),
              endorsementCount: 0,
              endorsements: [],
            }
          : null,
        moderationStatus: post.moderationStatus as 'active' | 'under_review' | 'removed',
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        repostCount: post.reposts.length,
        repostedByViewer: false,
        likedByViewer: false,
      },
    ])
  )
  const postOwnerMap = new Map(posts.map((post) => [post.id, post.user]))

  const targetUserIds = Array.from(
    new Set(
      reports
        .map((report) => (report.targetType === 'proof' ? proofOwnerMap.get(report.targetId)?.id : postOwnerMap.get(report.targetId)?.id))
        .filter((value): value is string => Boolean(value))
    )
  )

  const [allTargetProofs, allTargetPosts] = await Promise.all([
    prisma.proof.findMany({
      where: {
        userId: { in: targetUserIds },
      },
      select: {
        id: true,
        userId: true,
        moderationStatus: true,
        riskScore: true,
      },
    }),
    prisma.post.findMany({
      where: {
        userId: { in: targetUserIds },
      },
      select: {
        id: true,
        userId: true,
        moderationStatus: true,
      },
    }),
  ])

  const reportCountsByUser = new Map<string, { total: number; open: number }>()
  for (const report of reports) {
    const ownerId =
      report.targetType === 'proof' ? proofOwnerMap.get(report.targetId)?.id : postOwnerMap.get(report.targetId)?.id

    if (!ownerId) {
      continue
    }

    const current = reportCountsByUser.get(ownerId) ?? { total: 0, open: 0 }
    current.total += 1
    if (report.status === 'open') {
      current.open += 1
    }
    reportCountsByUser.set(ownerId, current)
  }

  const removedCountsByUser = new Map<string, number>()
  const averageProofRiskByUser = new Map<string, { total: number; count: number }>()

  for (const proof of allTargetProofs) {
    if (proof.moderationStatus === 'removed') {
      removedCountsByUser.set(proof.userId, (removedCountsByUser.get(proof.userId) ?? 0) + 1)
    }
    const currentRisk = averageProofRiskByUser.get(proof.userId) ?? { total: 0, count: 0 }
    currentRisk.total += proof.riskScore
    currentRisk.count += 1
    averageProofRiskByUser.set(proof.userId, currentRisk)
  }

  for (const post of allTargetPosts) {
    if (post.moderationStatus === 'removed') {
      removedCountsByUser.set(post.userId, (removedCountsByUser.get(post.userId) ?? 0) + 1)
    }
  }

  const buildTargetAccount = (
    user: (typeof proofs)[number]['user'] | (typeof posts)[number]['user'] | undefined,
    proofRiskScore?: number
  ): ModerationTargetAccount | null => {
    if (!user) {
      return null
    }

    const reportCounts = reportCountsByUser.get(user.id) ?? { total: 0, open: 0 }
    const removedContentCount = removedCountsByUser.get(user.id) ?? 0
    const averageRisk = averageProofRiskByUser.get(user.id)
    const baselineRisk = averageRisk && averageRisk.count > 0 ? averageRisk.total / averageRisk.count : 0
    const suspiciousScore = Math.min(
      100,
      reportCounts.total * 14 +
        reportCounts.open * 18 +
        removedContentCount * 22 +
        (normalizeTrustLevel(user.trustLevel) === 'standard' ? 8 : 0) +
        (user.identityVerifiedAt ? 0 : 6) +
        Math.round(Math.max(proofRiskScore ?? 0, baselineRisk) / 4)
    )

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      headline: user.headline,
      avatarUrl: user.avatarUrl,
      currentRole: user.currentRole,
      currentCompany: user.currentCompany,
      trustLevel: user.trustLevel,
      identityVerifiedAt: user.identityVerifiedAt?.toISOString() ?? null,
      reportCount: reportCounts.total,
      openReportCount: reportCounts.open,
      removedContentCount,
      suspiciousScore,
      isRepeatOffender: reportCounts.total >= 2 || removedContentCount >= 1,
    }
  }

  const sortedReports = [...reports].sort((left, right) => {
    const trustDelta = getTrustWeight(right.reporterTrustLevel) - getTrustWeight(left.reporterTrustLevel)
    if (trustDelta !== 0) {
      return trustDelta
    }

    return right.createdAt.getTime() - left.createdAt.getTime()
  })

  const response: ModerationQueueResponse = {
    items: sortedReports.map((report) => ({
      report: {
        id: report.id,
        targetType: report.targetType as 'proof' | 'post',
        targetId: report.targetId,
        reason: report.reason as 'spam' | 'abuse' | 'fraud' | 'misleading' | 'copyright' | 'other',
        details: report.details,
        reporterTrustLevel: report.reporterTrustLevel,
        status: report.status as 'open' | 'reviewed' | 'dismissed' | 'actioned',
        createdAt: report.createdAt.toISOString(),
        resolvedAt: report.resolvedAt?.toISOString() ?? null,
        reporter: report.reporter,
      },
      proof: report.targetType === 'proof' ? proofMap.get(report.targetId) ?? null : null,
      post: report.targetType === 'post' ? postMap.get(report.targetId) ?? null : null,
      targetAccount:
        report.targetType === 'proof'
          ? buildTargetAccount(proofOwnerMap.get(report.targetId), proofMap.get(report.targetId)?.riskScore)
          : buildTargetAccount(postOwnerMap.get(report.targetId)),
      actions: report.actions.map((action) => ({
        id: action.id,
        reportStatus: action.reportStatus as 'open' | 'reviewed' | 'dismissed' | 'actioned',
        contentStatus: (action.contentStatus as 'active' | 'under_review' | 'removed' | null) ?? null,
        note: action.note,
        createdAt: action.createdAt.toISOString(),
        admin: action.admin,
      })),
    })),
  }

  return NextResponse.json(response)
}

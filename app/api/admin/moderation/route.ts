import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentToken } from '@/lib/auth-options'
import { isAdminUsername } from '@/lib/services/admin'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { ModerationQueueResponse, PeerVerification, Proof } from '@/lib/types'

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

const toEndorsement = (endorsement: {
  id: string
  verifierName: string
  verifierRole: string | null
  verifierCompany: string | null
  relationship: string
  message: string
  createdAt: Date
}): PeerVerification => ({
  id: endorsement.id,
  verifierName: endorsement.verifierName,
  verifierRole: endorsement.verifierRole,
  verifierCompany: endorsement.verifierCompany,
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
      },
    }),
    prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        user: {
          select: authorSelect,
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
            moderationStatus: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
        likes: { select: { userId: true } },
        comments: { select: { id: true } },
      },
    }),
  ])

  const proofMap = new Map(proofs.map((proof) => [proof.id, toProof(proof)]))
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
        likedByViewer: false,
      },
    ])
  )

  const response: ModerationQueueResponse = {
    items: reports.map((report) => ({
      report: {
        id: report.id,
        targetType: report.targetType as 'proof' | 'post',
        targetId: report.targetId,
        reason: report.reason as 'spam' | 'abuse' | 'fraud' | 'misleading' | 'copyright' | 'other',
        details: report.details,
        status: report.status as 'open' | 'reviewed' | 'dismissed' | 'actioned',
        createdAt: report.createdAt.toISOString(),
        resolvedAt: report.resolvedAt?.toISOString() ?? null,
        reporter: report.reporter,
      },
      proof: report.targetType === 'proof' ? proofMap.get(report.targetId) ?? null : null,
      post: report.targetType === 'post' ? postMap.get(report.targetId) ?? null : null,
    })),
  }

  return NextResponse.json(response)
}

import { FeedComment, FeedPost, Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { parseEvidenceItems } from '@/lib/services/evidence'

const toProof = (proof: {
  id: string
  title: string
  description: string
  link: string | null
  sourceCategory: string
  artifactSummary: string | null
  evidenceItems: string
  profession: string
  proofType: string
  outcomeSummary: string | null
  score: number
  feedback: string | null
  tags: string | null
  txHash: string
  verificationStatus: string
  verificationConfidence: number
  verificationSignals: string
  riskScore?: number
  riskFlags?: string
  moderationStatus?: string
  verifiedAt: Date | null
  createdAt: Date
}): Proof => ({
  id: proof.id,
  title: proof.title,
  description: proof.description,
  link: proof.link,
  sourceCategory: proof.sourceCategory as Proof['sourceCategory'],
  artifactSummary: proof.artifactSummary,
  evidenceItems: parseEvidenceItems(proof.evidenceItems),
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
  riskFlags: parseTags(proof.riskFlags ?? null),
  moderationStatus: (proof.moderationStatus as Proof['moderationStatus']) ?? 'active',
  verifiedAt: proof.verifiedAt?.toISOString() ?? null,
  endorsements: [],
  endorsementCount: 0,
  createdAt: proof.createdAt.toISOString(),
})

export const toFeedPost = (post: {
  id: string
  body: string
  postType: string
  moderationStatus: string
  createdAt: Date
  user: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
  proof: {
    id: string
    title: string
    description: string
    link: string | null
    sourceCategory: string
    artifactSummary: string | null
    evidenceItems: string
    profession: string
    proofType: string
    outcomeSummary: string | null
    score: number
    feedback: string | null
    tags: string | null
    txHash: string
    verificationStatus: string
    verificationConfidence: number
    verificationSignals: string
    riskScore?: number
    riskFlags?: string
    moderationStatus?: string
    verifiedAt: Date | null
    createdAt: Date
  } | null
  reposts: Array<{ userId: string }>
  likes: Array<{ userId: string }>
  comments: Array<{ id: string }>
}, currentUserId: string): FeedPost => ({
  id: post.id,
  body: post.body,
  postType: post.postType === 'proof_share' ? 'proof_share' : 'text',
  moderationStatus: post.moderationStatus as FeedPost['moderationStatus'],
  createdAt: post.createdAt.toISOString(),
  author: {
    id: post.user.id,
    username: post.user.username,
    displayName: post.user.displayName,
    headline: post.user.headline,
    avatarUrl: post.user.avatarUrl,
    currentRole: post.user.currentRole,
    currentCompany: post.user.currentCompany,
  },
  proof: post.proof ? toProof(post.proof) : null,
  likeCount: post.likes.length,
  commentCount: post.comments.length,
  repostCount: post.reposts.length,
  repostedByViewer: post.reposts.some((repost) => repost.userId === currentUserId),
  likedByViewer: post.likes.some((like) => like.userId === currentUserId),
})

export const toFeedComment = (comment: {
  id: string
  body: string
  createdAt: Date
  user: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
}): FeedComment => ({
  id: comment.id,
  body: comment.body,
  createdAt: comment.createdAt.toISOString(),
  author: {
    id: comment.user.id,
    username: comment.user.username,
    displayName: comment.user.displayName,
    headline: comment.user.headline,
    avatarUrl: comment.user.avatarUrl,
    currentRole: comment.user.currentRole,
    currentCompany: comment.user.currentCompany,
  },
})

import { ConversationRecord, MessageRecord, Proof } from '@/lib/types'
import { parseTags } from '@/lib/services/tags'
import { parseVerificationSignals } from '@/lib/services/verification'
import { parseEvidenceItems } from '@/lib/services/evidence'

export const conversationParticipantSelect = {
  id: true,
  username: true,
  displayName: true,
  headline: true,
  avatarUrl: true,
  currentRole: true,
  currentCompany: true,
} as const

export const toMessageRecord = (message: {
  id: string
  body: string
  createdAt: Date
  senderId: string
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
    tags: string
    txHash: string
    verificationStatus: string
    verificationConfidence: number
    verificationSignals: string
    verifiedAt: Date | null
    createdAt: Date
  } | null
}): MessageRecord => ({
  id: message.id,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  senderId: message.senderId,
  proof: message.proof
    ? ({
        id: message.proof.id,
        title: message.proof.title,
        description: message.proof.description,
        link: message.proof.link,
        sourceCategory: message.proof.sourceCategory as Proof['sourceCategory'],
        artifactSummary: message.proof.artifactSummary,
        evidenceItems: parseEvidenceItems(message.proof.evidenceItems),
        profession: message.proof.profession,
        proofType: message.proof.proofType,
        outcomeSummary: message.proof.outcomeSummary,
        score: message.proof.score,
        feedback: message.proof.feedback,
        tags: parseTags(message.proof.tags),
        txHash: message.proof.txHash,
        verificationStatus: message.proof.verificationStatus,
        verificationConfidence: message.proof.verificationConfidence,
        verificationSignals: parseVerificationSignals(message.proof.verificationSignals),
        verifiedAt: message.proof.verifiedAt?.toISOString() ?? null,
        endorsements: [],
        endorsementCount: 0,
        createdAt: message.proof.createdAt.toISOString(),
      } satisfies Proof)
    : null,
})

export const toConversationRecord = (
  conversation: {
    id: string
    createdAt: Date
    updatedAt: Date
    lastMessageAt: Date | null
    participants: Array<{
      user: {
        id: string
        username: string
        displayName: string | null
        headline: string | null
        avatarUrl: string | null
        currentRole: string | null
        currentCompany: string | null
      }
      lastReadAt: Date | null
    }>
    messages: Array<{
      id: string
      body: string
      createdAt: Date
      senderId: string
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
        tags: string
        txHash: string
        verificationStatus: string
        verificationConfidence: number
        verificationSignals: string
        verifiedAt: Date | null
        createdAt: Date
      } | null
    }>
  },
  currentUserId: string
): ConversationRecord => {
  const latestMessage = conversation.messages[0] ? toMessageRecord(conversation.messages[0]) : null
  const currentParticipant = conversation.participants.find((participant) => participant.user.id === currentUserId)
  const unreadCount = conversation.messages.filter(
    (message) =>
      message.senderId !== currentUserId &&
      (!currentParticipant?.lastReadAt || message.createdAt > currentParticipant.lastReadAt)
  ).length

  return {
    id: conversation.id,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    participants: conversation.participants.map((participant) => participant.user),
    latestMessage,
    unreadCount,
  }
}

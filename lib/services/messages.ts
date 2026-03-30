import { ConversationRecord, MessageRecord } from '@/lib/types'

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
}): MessageRecord => ({
  id: message.id,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  senderId: message.senderId,
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

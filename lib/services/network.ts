import { ConnectionRecord, NetworkCounts, ProfileConnectionState } from '@/lib/types'

export const toPreviewUser = (user: {
  id: string
  username: string
  displayName: string | null
  headline: string | null
  avatarUrl: string | null
  currentRole: string | null
  currentCompany: string | null
}) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  headline: user.headline,
  avatarUrl: user.avatarUrl,
  currentRole: user.currentRole,
  currentCompany: user.currentCompany,
})

export const toConnectionRecord = (connection: {
  id: string
  status: string
  createdAt: Date
  respondedAt: Date | null
  requester: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
  recipient: {
    id: string
    username: string
    displayName: string | null
    headline: string | null
    avatarUrl: string | null
    currentRole: string | null
    currentCompany: string | null
  }
}): ConnectionRecord => ({
  id: connection.id,
  status: connection.status === 'accepted' ? 'accepted' : 'pending',
  createdAt: connection.createdAt.toISOString(),
  respondedAt: connection.respondedAt?.toISOString() ?? null,
  requester: toPreviewUser(connection.requester),
  recipient: toPreviewUser(connection.recipient),
})

export const emptyNetworkCounts: NetworkCounts = {
  totalConnections: 0,
  incomingRequests: 0,
  outgoingRequests: 0,
}

export const resolveProfileConnectionState = (
  viewerUserId: string | null,
  profileUserId: string,
  connection: {
    id: string
    status: string
    requesterId: string
    recipientId: string
  } | null
): ProfileConnectionState => {
  if (!viewerUserId || viewerUserId === profileUserId || !connection) {
    return {
      status: 'none',
      connectionId: null,
    }
  }

  if (connection.status === 'accepted') {
    return {
      status: 'connected',
      connectionId: connection.id,
    }
  }

  if (connection.requesterId === viewerUserId) {
    return {
      status: 'pending_outgoing',
      connectionId: connection.id,
    }
  }

  return {
    status: 'pending_incoming',
    connectionId: connection.id,
  }
}

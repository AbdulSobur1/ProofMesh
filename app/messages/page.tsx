'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, Paperclip, Search, Send } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationRecord, ConversationThreadResponse, InboxResponse } from '@/lib/types'
import { useProofs } from '@/lib/proof-context'

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No messages yet'

function MessagesPageContent() {
  const outreachTemplates = useMemo(
    () => [
      'Hi, I came across your proof-backed profile and would love to connect about a role I think fits your work.',
      'Your submitted proofs stood out. I would like to learn more about how you approach this kind of work.',
      'I reviewed your profile and strongest proof. Are you open to a quick conversation this week?',
    ],
    []
  )
  const searchParams = useSearchParams()
  const targetUsername = searchParams.get('user') ?? ''
  const { currentUser, proofs } = useProofs()
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [thread, setThread] = useState<ConversationThreadResponse | null>(null)
  const [draft, setDraft] = useState('')
  const [newConversationMessage, setNewConversationMessage] = useState('')
  const [attachedProofId, setAttachedProofId] = useState('')
  const [newConversationProofId, setNewConversationProofId] = useState('')
  const [inboxQuery, setInboxQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [isLoadingInbox, setIsLoadingInbox] = useState(true)
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMobileThread, setShowMobileThread] = useState(false)

  const loadInbox = useCallback(async () => {
    setIsLoadingInbox(true)
    setError(null)
    try {
      const response = await fetch('/api/messages', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load inbox')
      }
      const payload = (await response.json()) as InboxResponse
      setConversations(payload.conversations)
      setSelectedConversationId((current) => current ?? payload.conversations[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoadingInbox(false)
    }
  }, [])

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (!targetUsername || conversations.length === 0) return

    const existingConversation = conversations.find((conversation) =>
      conversation.participants.some((participant) => participant.username === targetUsername)
    )

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id)
      setShowMobileThread(true)
    }
  }, [conversations, targetUsername])

  useEffect(() => {
    const loadThread = async () => {
      if (!selectedConversationId) {
        setThread(null)
        return
      }

      setIsLoadingThread(true)
      setError(null)
      try {
        const response = await fetch(`/api/messages/${encodeURIComponent(selectedConversationId)}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Failed to load conversation')
        }
        const payload = (await response.json()) as ConversationThreadResponse
        setThread(payload)
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                }
              : conversation
          )
        )
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoadingThread(false)
      }
    }

    loadThread()
  }, [selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) {
      setShowMobileThread(false)
    }
  }, [selectedConversationId])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  )
  const filteredConversations = useMemo(() => {
    const normalizedQuery = inboxQuery.trim().toLowerCase()
    return conversations.filter((conversation) => {
      const otherUser = conversation.participants.find((participant) => participant.id !== currentUser?.id) ?? conversation.participants[0]
      const matchesQuery =
        !normalizedQuery ||
        [otherUser?.displayName ?? '', otherUser?.username ?? '', conversation.latestMessage?.body ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      const matchesUnread = !unreadOnly || conversation.unreadCount > 0
      return matchesQuery && matchesUnread
    })
  }, [conversations, currentUser?.id, inboxQuery, unreadOnly])

  const selectedOtherUser = selectedConversation?.participants.find((participant) => participant.id !== currentUser?.id) ?? null
  const selectableProofs = useMemo(() => proofs.slice(0, 12), [proofs])
  const attachedProof = useMemo(
    () => selectableProofs.find((proof) => proof.id === attachedProofId) ?? null,
    [attachedProofId, selectableProofs]
  )
  const newConversationProof = useMemo(
    () => selectableProofs.find((proof) => proof.id === newConversationProofId) ?? null,
    [newConversationProofId, selectableProofs]
  )

  const sendMessage = async () => {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || !selectedConversationId) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(selectedConversationId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: trimmedDraft,
          proofId: attachedProofId || undefined,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to send message')
      }

      setDraft('')
      setAttachedProofId('')
      await loadInbox()
      const threadResponse = await fetch(`/api/messages/${encodeURIComponent(selectedConversationId)}`, {
        cache: 'no-store',
      })
      if (threadResponse.ok) {
        setThread((await threadResponse.json()) as ConversationThreadResponse)
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const startConversation = async () => {
    const trimmedMessage = newConversationMessage.trim()
    if (!targetUsername || !trimmedMessage) return

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUsername,
          body: trimmedMessage,
          proofId: newConversationProofId || undefined,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to start conversation')
      }

      setNewConversationMessage('')
      setNewConversationProofId('')
      await loadInbox()
      setSelectedConversationId(payload.conversation.id)
      setShowMobileThread(true)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start conversation')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 md:ml-72 md:pb-0">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Private messages</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Talk to your accepted connections.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This is the second social layer in ProofMesh: once two people are connected, they can move from profile credibility into direct conversation.
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          {targetUsername && !selectedConversationId ? (
            <Card className="mt-6 rounded-[2rem] border border-border/60 p-6">
              <h2 className="text-lg font-semibold text-foreground">Start a conversation with @{targetUsername}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You can only send messages to accepted connections.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {outreachTemplates.map((template) => (
                  <Button
                    key={template}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewConversationMessage(template)}
                  >
                    Use template
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Input value={newConversationMessage} onChange={(event) => setNewConversationMessage(event.target.value)} placeholder="Write your first message..." />
                <select
                  value={newConversationProofId}
                  onChange={(event) => setNewConversationProofId(event.target.value)}
                  className="h-11 min-w-[220px] rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
                >
                  <option value="">Attach proof (optional)</option>
                  {selectableProofs.map((proof) => (
                    <option key={proof.id} value={proof.id}>
                      {proof.title}
                    </option>
                  ))}
                </select>
                <Button onClick={startConversation} disabled={isSending || !newConversationMessage.trim()}>
                  <Send className="size-4" />
                  Send
                </Button>
              </div>
              {newConversationProof ? (
                <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  Attaching proof: <span className="font-medium text-foreground">{newConversationProof.title}</span>
                </div>
              ) : null}
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card className={`rounded-[2rem] border border-border/60 p-4 ${showMobileThread ? 'hidden lg:flex' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
                <span className="text-sm text-muted-foreground">{isLoadingInbox ? '...' : conversations.length}</span>
              </div>
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={inboxQuery}
                    onChange={(event) => setInboxQuery(event.target.value)}
                    placeholder="Search inbox"
                    className="pl-9"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(event) => setUnreadOnly(event.target.checked)}
                    className="size-4 rounded border-border/60"
                  />
                  Show unread only
                </label>
              </div>
              {isLoadingInbox ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  {conversations.length === 0
                    ? 'No conversations yet. Start from a connected user\'s profile or your network page.'
                    : 'No conversations match the current inbox filters.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map((conversation) => {
                    const otherUser = conversation.participants.find((participant) => participant.id !== currentUser?.id) ?? conversation.participants[0]

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => {
                          setSelectedConversationId(conversation.id)
                          setShowMobileThread(true)
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selectedConversationId === conversation.id
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-border/60 bg-background/60 hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {otherUser?.displayName || otherUser?.username || 'Conversation'}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {conversation.latestMessage?.body || 'No messages yet'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{formatTime(conversation.lastMessageAt)}</p>
                            {conversation.unreadCount > 0 ? (
                              <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {conversation.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card className={`rounded-[2rem] border border-border/60 p-4 sm:p-6 ${!showMobileThread ? 'hidden lg:flex' : ''}`}>
              {!selectedConversationId ? (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border/60 text-center text-sm text-muted-foreground">
                  Select a conversation to read messages.
                </div>
              ) : isLoadingThread || !thread ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[520px] flex-col">
                  <div className="border-b border-border/60 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-3 lg:hidden">
                          <Button variant="ghost" size="sm" onClick={() => setShowMobileThread(false)} className="px-0">
                            <ArrowLeft className="size-4" />
                            Back to inbox
                          </Button>
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {selectedOtherUser?.displayName || selectedOtherUser?.username || 'Conversation'}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedOtherUser?.headline || [selectedOtherUser?.currentRole, selectedOtherUser?.currentCompany].filter(Boolean).join(' at ') || 'Connected on ProofMesh'}
                        </p>
                      </div>
                      {selectedOtherUser?.username ? (
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <Link href={`/profile/${encodeURIComponent(selectedOtherUser.username)}`}>View profile</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto py-6">
                    {thread.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No messages yet.</p>
                    ) : (
                      thread.messages.map((message) => {
                        const isOwn = message.senderId === currentUser?.id
                        return (
                          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border/60 bg-background/70 text-foreground'
                              }`}
                            >
                              <p>{message.body}</p>
                              {message.proof ? (
                                <div className={`mt-3 rounded-xl border px-3 py-3 ${isOwn ? 'border-primary-foreground/20 bg-primary-foreground/10' : 'border-border/60 bg-background/60'}`}>
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                                    <Paperclip className="size-3.5" />
                                    Attached proof
                                  </div>
                                  <p className="mt-2 text-sm font-semibold">{message.proof.title}</p>
                                  <p className={`mt-1 text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                    {message.proof.score}/10 score • {message.proof.verificationConfidence}% trust
                                  </p>
                                  <Link
                                    href={`/proof/${message.proof.id}`}
                                    className={`mt-2 inline-flex text-xs font-medium ${isOwn ? 'text-primary-foreground' : 'text-primary hover:underline'}`}
                                  >
                                    Open proof
                                  </Link>
                                </div>
                              ) : null}
                              <p className={`mt-2 text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {outreachTemplates.map((template) => (
                        <Button
                          key={template}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDraft(template)}
                        >
                          Use template
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <select
                        value={attachedProofId}
                        onChange={(event) => setAttachedProofId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
                      >
                        <option value="">Attach proof (optional)</option>
                        {selectableProofs.map((proof) => (
                          <option key={proof.id} value={proof.id}>
                            {proof.title}
                          </option>
                        ))}
                      </select>
                      {attachedProof ? (
                        <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                          Attaching proof: <span className="font-medium text-foreground">{attachedProof.title}</span>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder="Write a message..."
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              void sendMessage()
                            }
                          }}
                        />
                        <Button onClick={sendMessage} disabled={isSending || !draft.trim()} className="sm:self-auto">
                          <Send className="size-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
            <Skeleton className="h-40 w-full rounded-[2rem]" />
          </div>
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  )
}

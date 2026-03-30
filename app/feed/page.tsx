'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Flag, Heart, MessageCircle, Newspaper, Repeat2, Send } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ProofCard } from '@/components/proof-card'
import { useProofs } from '@/lib/proof-context'
import { FeedComment, FeedCommentsResponse, FeedPost, FeedResponse } from '@/lib/types'

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export default function FeedPage() {
  const { proofs, currentUser } = useProofs()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [postType, setPostType] = useState<'text' | 'proof_share'>('text')
  const [selectedProofId, setSelectedProofId] = useState('')
  const [engagingPostId, setEngagingPostId] = useState<string | null>(null)
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null)
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, FeedComment[]>>({})
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({})
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/feed', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load feed')
      }
      const payload = (await response.json()) as FeedResponse
      setPosts(payload.posts)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selectableProofs = useMemo(() => proofs.slice(0, 12), [proofs])

  const publish = async () => {
    if (!body.trim()) return

    setIsPosting(true)
    setError(null)
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body,
          postType,
          proofId: postType === 'proof_share' ? selectedProofId : undefined,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to publish update')
      }

      setBody('')
      setSelectedProofId('')
      setPostType('text')
      await load()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish update')
    } finally {
      setIsPosting(false)
    }
  }

  const toggleLike = async (postId: string) => {
    setEngagingPostId(postId)
    setError(null)
    try {
      const response = await fetch(`/api/feed/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update like')
      }
      await load()
    } catch (engagementError) {
      setError(engagementError instanceof Error ? engagementError.message : 'Failed to update like')
    } finally {
      setEngagingPostId(null)
    }
  }

  const loadComments = async (postId: string) => {
    setEngagingPostId(postId)
    setError(null)
    try {
      const response = await fetch(`/api/feed/${encodeURIComponent(postId)}/comments`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as FeedCommentsResponse
      if (!response.ok) {
        throw new Error('Failed to load comments')
      }
      setCommentsByPostId((current) => ({ ...current, [postId]: payload.comments }))
      setOpenCommentsPostId((current) => (current === postId ? null : postId))
    } catch (commentsError) {
      setError(commentsError instanceof Error ? commentsError.message : 'Failed to load comments')
    } finally {
      setEngagingPostId(null)
    }
  }

  const addComment = async (postId: string) => {
    const draft = commentDraftByPostId[postId]?.trim()
    if (!draft) return

    setEngagingPostId(postId)
    setError(null)
    try {
      const response = await fetch(`/api/feed/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: draft }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to add comment')
      }

      setCommentDraftByPostId((current) => ({ ...current, [postId]: '' }))
      await load()
      await loadComments(postId)
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : 'Failed to add comment')
    } finally {
      setEngagingPostId(null)
    }
  }

  const reportPost = async (postId: string) => {
    setReportingPostId(postId)
    setError(null)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType: 'post',
          targetId: postId,
          reason: 'misleading',
          details: 'Reported from feed for moderation review.',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to report post')
      }
      await load()
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Failed to report post')
    } finally {
      setReportingPostId(null)
    }
  }

  const toggleRepost = async (postId: string) => {
    setEngagingPostId(postId)
    setError(null)
    try {
      const response = await fetch(`/api/feed/${encodeURIComponent(postId)}/repost`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update repost')
      }
      await load()
    } catch (repostError) {
      setError(repostError instanceof Error ? repostError.message : 'Failed to update repost')
    } finally {
      setEngagingPostId(null)
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
                <Newspaper className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Activity feed</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">See what your proof-backed network is building.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Publish professional updates, share proofs, and keep your network moving around actual work instead of empty self-promotion.
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Share an update</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentUser ? `Posting as ${currentUser.displayName || currentUser.username}` : 'Post to your feed'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant={postType === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setPostType('text')}>
                      Text update
                    </Button>
                    <Button type="button" variant={postType === 'proof_share' ? 'default' : 'outline'} size="sm" onClick={() => setPostType('proof_share')}>
                      Proof share
                    </Button>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={4}
                    placeholder={
                      postType === 'proof_share'
                        ? 'Add context to the proof you are sharing...'
                        : 'Share what you are learning, building, or shipping...'
                    }
                  />

                  {postType === 'proof_share' ? (
                    selectableProofs.length === 0 ? (
                      <Card className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                        You need at least one proof before you can share one.
                        <Link href="/submit" className="ml-2 font-medium text-primary hover:underline">
                          Submit proof
                        </Link>
                      </Card>
                    ) : (
                      <select
                        value={selectedProofId}
                        onChange={(event) => setSelectedProofId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
                      >
                        <option value="">Select a proof to share</option>
                        {selectableProofs.map((proof) => (
                          <option key={proof.id} value={proof.id}>
                            {proof.title}
                          </option>
                        ))}
                      </select>
                    )
                  ) : null}

                  <div className="flex justify-end">
                    <Button onClick={publish} disabled={isPosting || !body.trim() || (postType === 'proof_share' && !selectedProofId)}>
                      <Send className="size-4" />
                      {isPosting ? 'Publishing...' : 'Publish'}
                    </Button>
                  </div>
                </div>
              </Card>

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Latest activity</h2>
                  <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                    {isLoading ? 'Loading…' : `${posts.length} posts`}
                  </Badge>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-56 w-full rounded-[2rem]" />
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                    No activity yet. Publish the first update or grow your network to populate the feed.
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <Card key={post.id} className="rounded-[2rem] border border-border/60 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-foreground">
                                {post.author.displayName || post.author.username}
                              </h3>
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                @{post.author.username}
                              </Badge>
                              <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                {post.postType === 'proof_share' ? 'Proof share' : 'Text update'}
                              </Badge>
                              {post.moderationStatus === 'under_review' ? (
                                <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-400">
                                  Under review
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {post.author.headline || [post.author.currentRole, post.author.currentCompany].filter(Boolean).join(' at ') || 'Proof-backed professional'}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</span>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-foreground/85">{post.body}</p>

                        {post.proof ? (
                          <div className="mt-5">
                            <ProofCard proof={post.proof} />
                          </div>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleLike(post.id)}
                            disabled={engagingPostId === post.id}
                            className={post.likedByViewer ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : ''}
                          >
                            <Heart className="size-4" />
                            {post.likeCount} like{post.likeCount === 1 ? '' : 's'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => loadComments(post.id)}
                            disabled={engagingPostId === post.id}
                          >
                            <MessageCircle className="size-4" />
                            {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRepost(post.id)}
                            disabled={engagingPostId === post.id}
                            className={post.repostedByViewer ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' : ''}
                          >
                            <Repeat2 className="size-4" />
                            {post.repostCount} repost{post.repostCount === 1 ? '' : 's'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => reportPost(post.id)}
                            disabled={reportingPostId === post.id}
                          >
                            <Flag className="size-4" />
                            Report
                          </Button>
                        </div>

                        {openCommentsPostId === post.id ? (
                          <div className="mt-5 space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                            <div className="space-y-3">
                              {(commentsByPostId[post.id] ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No comments yet.</p>
                              ) : (
                                (commentsByPostId[post.id] ?? []).map((comment) => (
                                  <div key={comment.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-foreground">
                                          {comment.author.displayName || comment.author.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground">@{comment.author.username}</p>
                                      </div>
                                      <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-foreground/85">{comment.body}</p>
                                  </div>
                                ))
                              )}
                            </div>

                            <div className="flex gap-3">
                              <Textarea
                                value={commentDraftByPostId[post.id] ?? ''}
                                onChange={(event) =>
                                  setCommentDraftByPostId((current) => ({
                                    ...current,
                                    [post.id]: event.target.value,
                                  }))
                                }
                                rows={2}
                                placeholder="Add a comment..."
                              />
                              <Button onClick={() => addComment(post.id)} disabled={engagingPostId === post.id || !(commentDraftByPostId[post.id] ?? '').trim()}>
                                <Send className="size-4" />
                                Comment
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <Card className="h-fit rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Why this matters</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <p>LinkedIn has activity. ProofMesh now has activity anchored to actual work and verified proof.</p>
                <p>Text updates let people share progress. Proof shares let them attach that progress to evidence.</p>
                <p>This gives the network, messaging, and profile layers a real social surface to orbit around.</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldQuestion, UserRoundSearch } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ModerationQueueItem, ModerationQueueResponse } from '@/lib/types'
import { useProofs } from '@/lib/proof-context'
import { getTrustLabel, normalizeTrustLevel } from '@/lib/services/trust'

export default function ModerationPage() {
  const { currentUser } = useProofs()
  const [items, setItems] = useState<ModerationQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/admin/moderation', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load moderation queue')
        }
        setItems((payload as ModerationQueueResponse).items)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    if (currentUser?.isAdmin) {
      void load()
    } else {
      setIsLoading(false)
    }
  }, [currentUser?.isAdmin])

  const updateItem = async (reportId: string, reportStatus: 'reviewed' | 'dismissed' | 'actioned', contentStatus?: 'active' | 'under_review' | 'removed') => {
    setUpdatingId(reportId)
    setError(null)
    try {
      const response = await fetch(`/api/admin/moderation/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportStatus, contentStatus }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update moderation item')
      }
      setItems((current) =>
        current.map((item) =>
          item.report.id === reportId
            ? {
                ...item,
                report: {
                  ...item.report,
                  status: reportStatus,
                  resolvedAt: new Date().toISOString(),
                },
                proof: item.proof ? { ...item.proof, moderationStatus: contentStatus ?? item.proof.moderationStatus } : item.proof,
                post: item.post ? { ...item.post, moderationStatus: contentStatus ?? item.post.moderationStatus } : item.post,
                actions: [
                  {
                    id: `${reportId}-${Date.now()}`,
                    reportStatus,
                    contentStatus: contentStatus ?? null,
                    note: null,
                    createdAt: new Date().toISOString(),
                    admin: {
                      id: currentUser?.id ?? 'admin',
                      username: currentUser?.username ?? 'admin',
                      displayName: currentUser?.displayName ?? null,
                      headline: currentUser?.headline ?? null,
                      avatarUrl: currentUser?.avatarUrl ?? null,
                      currentRole: currentUser?.currentRole ?? null,
                      currentCompany: currentUser?.currentCompany ?? null,
                    },
                  },
                  ...item.actions,
                ],
              }
            : item
        )
      )
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update moderation item')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldAlert className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Moderation</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Review reports and protect trust.</h1>
              </div>
            </div>
          </section>

          {!currentUser?.isAdmin ? (
            <Card className="mt-6 rounded-[2rem] border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              This page is only available to admin accounts.
            </Card>
          ) : null}

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          {currentUser?.isAdmin ? (
            <section className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-48 w-full rounded-[2rem]" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  No reports in the queue.
                </Card>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const trustLevel = normalizeTrustLevel(item.report.reporterTrustLevel)
                    const trustClassName =
                      trustLevel === 'verified'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : trustLevel === 'elevated'
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                          : 'border-border/60 bg-background/60 text-muted-foreground'

                    return (
                    <Card key={item.report.id} className="rounded-[2rem] border border-border/60 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                              {item.report.targetType}
                            </Badge>
                            <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                              {item.report.reason}
                            </Badge>
                            <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                              {item.report.status}
                            </Badge>
                            <Badge variant="secondary" className={trustClassName}>
                              {getTrustLabel(item.report.reporterTrustLevel)}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            Reported by {item.report.reporter.displayName || item.report.reporter.username}
                          </p>
                          {item.report.details ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.report.details}</p> : null}
                          {item.targetAccount ? (
                            <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                  <UserRoundSearch className="size-4 text-primary" />
                                  Target account
                                </div>
                                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                  Risk score {item.targetAccount.suspiciousScore}/100
                                </Badge>
                                {item.targetAccount.isRepeatOffender ? (
                                  <Badge className="bg-amber-500 text-black">Repeat offender</Badge>
                                ) : null}
                              </div>
                              <p className="mt-3 text-sm font-semibold text-foreground">
                                {item.targetAccount.displayName || item.targetAccount.username}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {item.targetAccount.reportCount} total reports
                                </Badge>
                                <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {item.targetAccount.openReportCount} open reports
                                </Badge>
                                <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {item.targetAccount.removedContentCount} removed items
                                </Badge>
                              </div>
                            </div>
                          ) : null}
                          {item.proof ? (
                            <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
                              <p className="text-sm font-semibold text-foreground">{item.proof.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{item.proof.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  Risk {item.proof.riskScore ?? 0}/100
                                </Badge>
                                {(item.proof.riskFlags ?? []).slice(0, 3).map((flag) => (
                                  <Badge key={flag} variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {item.post ? (
                            <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
                              <p className="text-sm font-semibold text-foreground">{item.post.author.displayName || item.post.author.username}</p>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{item.post.body}</p>
                            </div>
                          ) : null}
                          {item.actions.length > 0 ? (
                            <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <ShieldQuestion className="size-4 text-primary" />
                                Audit history
                              </div>
                              <div className="mt-3 space-y-2">
                                {item.actions.slice(0, 3).map((action) => (
                                  <div key={action.id} className="rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                                    <p className="font-medium text-foreground">
                                      {action.admin.displayName || action.admin.username} set report to {action.reportStatus}
                                      {action.contentStatus ? ` and content to ${action.contentStatus}` : ''}
                                    </p>
                                    <p className="mt-1">{new Date(action.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <Button variant="outline" onClick={() => updateItem(item.report.id, 'reviewed', 'under_review')} disabled={updatingId === item.report.id}>
                            Mark reviewed
                          </Button>
                          <Button variant="outline" onClick={() => updateItem(item.report.id, 'dismissed', 'active')} disabled={updatingId === item.report.id}>
                            Dismiss
                          </Button>
                          <Button onClick={() => updateItem(item.report.id, 'actioned', 'removed')} disabled={updatingId === item.report.id}>
                            Remove content
                          </Button>
                          {item.proof ? (
                            <Button asChild variant="outline">
                              <Link href={`/proof/${encodeURIComponent(item.proof.id)}`}>Open proof</Link>
                            </Button>
                          ) : null}
                          {item.post?.author.username ? (
                            <Button asChild variant="outline">
                              <Link href={`/profile/${encodeURIComponent(item.post.author.username)}`}>Open author</Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                    )
                  })}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  )
}

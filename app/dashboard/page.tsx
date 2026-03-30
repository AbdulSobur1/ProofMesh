"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BellRing, Eye, Newspaper, Search, Sparkles, ShieldCheck, Layers3 } from 'lucide-react'
import { useProofs } from '@/lib/proof-context'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { ProofCard } from '@/components/proof-card'
import { ReputationSection } from '@/components/reputation-section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProofCardSkeleton } from '@/components/dashboard/proof-card-skeleton'
import { StatsSkeleton } from '@/components/dashboard/stats-skeleton'
import { DashboardAnalyticsResponse } from '@/lib/types'

export default function DashboardPage() {
  const { proofs, reputation, isLoading, error, currentUser } = useProofs()
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null)

  useEffect(() => {
    if (!currentUser) {
      return
    }

    let cancelled = false

    const loadAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics', { cache: 'no-store' })
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as DashboardAnalyticsResponse
        if (!cancelled) {
          setAnalytics(payload)
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null)
        }
      }
    }

    void loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [currentUser])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Layers3 className="size-3.5 text-primary" />
                  {currentUser ? `Signed in as ${currentUser.username}` : 'Private workspace'}
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  A calm place to track proof, reputation, and AI feedback.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  ProofMesh keeps the dashboard focused: your score, your proof history, and the metadata that makes credibility feel real.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/submit" className="gap-2">
                    Submit proof
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={currentUser ? `/profile/${encodeURIComponent(currentUser.username)}` : '/login'}>
                    Open profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/feed" className="gap-2">
                    <Newspaper className="size-4" />
                    Open feed
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <div className="mt-6">
            {isLoading ? (
              <StatsSkeleton />
            ) : (
              <ReputationSection
                averageScore={reputation.averageScore}
                totalProofs={reputation.totalProofs}
                verifiedProofs={reputation.verifiedProofs}
                averageConfidence={reputation.averageConfidence}
                endorsementCount={reputation.endorsementCount}
              />
            )}
          </div>

          {!isLoading && currentUser && analytics ? (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Profile views</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{analytics.profileViews.totalViews}</p>
                <p className="mt-2 text-sm text-muted-foreground">Total tracked visits to your profile.</p>
              </Card>
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Unique viewers</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{analytics.profileViews.uniqueViewers}</p>
                <p className="mt-2 text-sm text-muted-foreground">Distinct signed-in people who checked you out.</p>
              </Card>
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved searches</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{analytics.savedSearches.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Queries you are actively tracking.</p>
              </Card>
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">New alerts</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                  {analytics.savedSearches.reduce((sum, search) => sum + search.newResultDelta, 0)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Fresh search matches since your last baseline.</p>
              </Card>
            </div>
          ) : null}

          {!isLoading && !currentUser ? (
            <Card className="mt-6 rounded-2xl border-border/60 p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">You are not signed in yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Log in or create an account to start collecting proofs and reputation.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/signup">Sign up</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {!isLoading && currentUser && analytics ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Recent viewers</h2>
                    <p className="mt-1 text-sm text-muted-foreground">People who recently opened your profile.</p>
                  </div>
                  <Eye className="size-5 text-primary" />
                </div>
                {analytics.profileViews.recentViewers.length === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">No signed-in profile viewers yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {analytics.profileViews.recentViewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{viewer.displayName || viewer.username}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {viewer.headline || [viewer.currentRole, viewer.currentCompany].filter(Boolean).join(' at ') || `@${viewer.username}`}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/profile/${encodeURIComponent(viewer.username)}`}>View</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="rounded-[2rem] border border-border/60 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Saved search alerts</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Track when new results appear for queries you care about.</p>
                  </div>
                  <BellRing className="size-5 text-primary" />
                </div>
                {analytics.savedSearches.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-border/60 p-5 text-sm text-muted-foreground">
                    Save searches from the global search page to start getting result-change alerts here.
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/search">
                        <Search className="size-4" />
                        Open search
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {analytics.savedSearches.map((search) => (
                      <div key={search.id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{search.query}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {search.currentResultCount} current results • {search.lastResultCount} last baseline
                            </p>
                          </div>
                          <Badge
                            variant={search.newResultDelta > 0 ? 'default' : 'outline'}
                            className={search.newResultDelta > 0 ? '' : 'border-border/60 bg-background/60 text-muted-foreground'}
                          >
                            {search.newResultDelta > 0 ? `+${search.newResultDelta} new` : 'Up to date'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : null}

          <section className="mt-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your proofs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLoading
                    ? 'Loading your proofs...'
                    : proofs.length === 0
                      ? 'Start by submitting your first proof'
                      : `${proofs.length} proof${proofs.length !== 1 ? 's' : ''} submitted`}
                </p>
              </div>
            </div>

            {error ? (
              <Card className="rounded-2xl border border-border/60 p-6 text-sm text-destructive">
                {error}
              </Card>
            ) : isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <ProofCardSkeleton key={index} />
                ))}
              </div>
            ) : proofs.length === 0 ? (
              <Card className="rounded-[2rem] border-dashed border-2 border-border/60 p-12 text-center">
                <div className="mb-5 flex justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No proofs yet</h3>
                <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-muted-foreground">
                  Start building your reputation by submitting your first proof.
                </p>
                <Button asChild>
                  <Link href="/submit" className="gap-2">
                    Submit your first proof
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {proofs.map((proof) => (
                  <ProofCard key={proof.id} proof={proof} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}




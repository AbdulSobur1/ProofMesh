"use client"

import Link from 'next/link'
import { ArrowRight, Sparkles, ShieldCheck, Layers3 } from 'lucide-react'
import { useProofs } from '@/lib/proof-context'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { ProofCard } from '@/components/proof-card'
import { ReputationSection } from '@/components/reputation-section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProofCardSkeleton } from '@/components/dashboard/proof-card-skeleton'
import { StatsSkeleton } from '@/components/dashboard/stats-skeleton'

export default function DashboardPage() {
  const { proofs, reputation, isLoading, error, currentUser } = useProofs()

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
              </div>
            </div>
          </section>

          <div className="mt-6">
            {isLoading ? (
              <StatsSkeleton />
            ) : (
              <ReputationSection averageScore={reputation.averageScore} totalProofs={reputation.totalProofs} />
            )}
          </div>

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

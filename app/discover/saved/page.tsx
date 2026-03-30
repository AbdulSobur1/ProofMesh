'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookmarkCheck } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CandidateCard } from '@/components/discovery/candidate-card'
import { DiscoveryResponse, type DiscoveryCandidate } from '@/lib/types'

export default function SavedCandidatesPage() {
  const [data, setData] = useState<DiscoveryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/discovery/saved', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load shortlist')
      }
      const payload = (await response.json()) as DiscoveryResponse
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleSave = async (candidate: DiscoveryCandidate) => {
    setSavingCandidateId(candidate.id)
    try {
      const response = await fetch('/api/discovery/saved', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidateId: candidate.id }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update shortlist')
      }

      setData((prev) =>
        prev
          ? {
              candidates: prev.candidates.filter((entry) => entry.id !== candidate.id),
            }
          : prev
      )
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update shortlist')
    } finally {
      setSavingCandidateId(null)
    }
  }

  const candidates = data?.candidates ?? []

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <BookmarkCheck className="size-3.5 text-primary" />
                  Recruiter shortlist
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Saved candidates ready for follow-up.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Keep a focused list of the strongest people you’ve found and return to their proof and trust signals when you’re ready to make decisions.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/discover" className="gap-2">
                    <ArrowLeft className="size-4" />
                    Back to discovery
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/discover/match" className="gap-2">
                    Match to roles
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Saved candidates</h2>
              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                {isLoading ? 'Loading…' : `${candidates.length} saved`}
              </Badge>
            </div>

            {error ? (
              <Card className="rounded-2xl border border-border/60 p-6 text-sm text-destructive">{error}</Card>
            ) : isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-[260px] w-full rounded-[2rem]" />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BookmarkCheck className="size-8" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">No saved candidates yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Head back to discovery, review candidate trust signals, and save the ones worth revisiting.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/discover">Go to discovery</Link>
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onToggleSave={toggleSave}
                    isSaving={savingCandidateId === candidate.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

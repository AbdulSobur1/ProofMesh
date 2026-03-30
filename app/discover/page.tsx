'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, SearchCheck, Users } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CandidateCard } from '@/components/discovery/candidate-card'
import { DiscoveryControls } from '@/components/discovery/discovery-controls'
import { DiscoveryResponse, DiscoverySortMode } from '@/lib/types'
import { filterCandidates, sortCandidates } from '@/lib/services/discovery'

export default function DiscoverPage() {
  const [data, setData] = useState<DiscoveryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [profession, setProfession] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortMode, setSortMode] = useState<DiscoverySortMode>('trust')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/discovery', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load discovery data')
        }
        const payload = (await response.json()) as DiscoveryResponse
        setData(payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const candidates = useMemo(() => data?.candidates ?? [], [data])
  const filteredCandidates = useMemo(
    () => sortCandidates(filterCandidates(candidates, { query, profession, minScore, verifiedOnly }), sortMode),
    [candidates, minScore, profession, query, sortMode, verifiedOnly]
  )

  const totals = useMemo(() => {
    return candidates.reduce(
      (acc, candidate) => {
        acc.candidates += 1
        acc.proofs += candidate.reputation.totalProofs
        acc.endorsements += candidate.reputation.endorsementCount
        return acc
      },
      { candidates: 0, proofs: 0, endorsements: 0 }
    )
  }, [candidates])

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
                  <SearchCheck className="size-3.5 text-primary" />
                  Recruiter discovery workspace
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Find people by proof, trust, and real professional signal.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Search candidates by trust confidence, proof quality, endorsements, and strongest work instead of relying on claim-only profiles.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/submit" className="gap-2">
                    Submit proof
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Candidates</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{isLoading ? '—' : totals.candidates}</p>
              <p className="mt-2 text-sm text-muted-foreground">Profiles with proof already on record.</p>
            </Card>
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Proof inventory</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{isLoading ? '—' : totals.proofs}</p>
              <p className="mt-2 text-sm text-muted-foreground">Artifacts and case studies available to review.</p>
            </Card>
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">External notes</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{isLoading ? '—' : totals.endorsements}</p>
              <p className="mt-2 text-sm text-muted-foreground">Peer, client, and manager verifications attached.</p>
            </Card>
          </div>

          <div className="mt-6">
            <DiscoveryControls
              query={query}
              onQueryChange={setQuery}
              profession={profession}
              onProfessionChange={setProfession}
              minScore={minScore}
              onMinScoreChange={setMinScore}
              verifiedOnly={verifiedOnly}
              onVerifiedOnlyChange={setVerifiedOnly}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
          </div>

          <section className="mt-8">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Candidate results</h2>
              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                {isLoading ? 'Loading…' : `${filteredCandidates.length} shown`}
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
            ) : filteredCandidates.length === 0 ? (
              <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="size-8" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">No matching candidates</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Try broadening the profession, lowering the score threshold, or turning off the trusted-only filter.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredCandidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

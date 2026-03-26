'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, ExternalLink, Hash, ShieldCheck, Sparkles, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProofDetailResponse } from '@/lib/types'

interface ProofDetailPageProps {
  params: {
    proofId: string
  }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export default function ProofDetailPage({ params }: ProofDetailPageProps) {
  const [data, setData] = useState<ProofDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/proofs/${encodeURIComponent(params.proofId)}`)
        if (!res.ok) {
          throw new Error('Proof not found')
        }
        const payload = (await res.json()) as ProofDetailResponse
        setData(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proof')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [params.proofId])

  const proof = data?.proof

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
      <div className="absolute -top-28 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="px-4 py-8 md:px-8">
          <Button asChild variant="outline" size="sm" className="mb-6 border-white/10 bg-white/[0.04]">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>

          {error ? (
            <Card className="p-8 border border-white/10 bg-white/[0.04]">
              <h1 className="text-2xl font-semibold text-foreground mb-2">Proof unavailable</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </Card>
          ) : isLoading || !proof ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
              <Card className="p-6 border border-white/10 bg-white/[0.04]">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-6 h-24 w-full" />
              </Card>
              <Skeleton className="h-[420px] w-full rounded-[24px]" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
              <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(2,6,23,0.24)] backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    <Sparkles className="size-4 text-primary" />
                    Verified Proof
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                    Score {proof.score}/10
                  </Badge>
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">{proof.title}</h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{proof.description}</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {proof.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/5 text-foreground border border-white/10">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {proof.feedback && (
                  <div className="mt-6 rounded-[24px] border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <Sparkles className="size-4 text-primary" />
                      AI Analysis
                    </div>
                    <p className="text-sm leading-7 text-foreground/85">{proof.feedback}</p>
                  </div>
                )}

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Date</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatDate(proof.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Owner</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{data.user.username}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Reputation</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{data.reputation.averageScore.toFixed(1)}/10</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {proof.link && (
                    <Button asChild>
                      <a href={proof.link} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                        View Source
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="border-white/10 bg-white/[0.04]">
                    <Link href={`/profile/${data.user.username}`}>
                      <User className="size-4" />
                      View Profile
                    </Link>
                  </Button>
                </div>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Audit Trail
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Timestamp</p>
                        <p className="mt-1 text-sm text-foreground">{formatDate(proof.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Hash className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Transaction Hash</p>
                        <p className="mt-1 font-mono text-xs leading-6 text-foreground/80 break-all">{proof.txHash ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Verified Owner</p>
                        <p className="mt-1 text-sm text-foreground">{data.user.username}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Reputation Signal</p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">Owner Summary</h2>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04]">
                      {data.reputation.totalProofs} proofs
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    This proof contributes to the owner’s public reputation score and tag distribution, making the record discoverable and verifiable across the profile surface.
                  </p>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

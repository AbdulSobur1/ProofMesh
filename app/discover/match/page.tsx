'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Target } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ROLE_PROFILES, ROLE_SLUGS, type RoleSlug } from '@/lib/role-taxonomy'
import { PROFESSION_LABELS, PROOF_TYPE_LABELS, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'
import { type RoleMatchResponse } from '@/lib/types'

export default function RoleMatchingPage() {
  const [selectedRole, setSelectedRole] = useState<RoleSlug>('frontend_engineer')
  const [data, setData] = useState<RoleMatchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/discovery/matches?role=${encodeURIComponent(selectedRole)}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to load role matches')
        }

        const payload = (await response.json()) as RoleMatchResponse
        setData(payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [selectedRole])

  const currentRole = useMemo(() => ROLE_PROFILES[selectedRole], [selectedRole])
  const roleProfessionLabel = PROFESSION_LABELS[currentRole.profession as ProofProfession] ?? currentRole.profession

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 md:ml-72 md:pb-0">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Target className="size-3.5 text-primary" />
                  Role matching workspace
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Match saved candidates to real job profiles.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Pick a role profile and ProofMesh will rank your shortlisted candidates by proof quality, trust signal, profession fit, and supporting evidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/discover/saved" className="gap-2">
                    <ArrowLeft className="size-4" />
                    Back to shortlist
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Role profile</p>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as RoleSlug)}
                className="mt-4 h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
              >
                {ROLE_SLUGS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_PROFILES[role].label}
                  </option>
                ))}
              </select>

              <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BriefcaseBusiness className="size-4 text-primary" />
                  {currentRole.label}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentRole.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                    {roleProfessionLabel}
                  </Badge>
                  <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                    {currentRole.minScore}+ avg score
                  </Badge>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Target tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentRole.targetTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Preferred proof types</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentRole.preferredProofTypes.map((proofType) => (
                    <Badge key={proofType} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                      {PROOF_TYPE_LABELS[proofType as ProofType] ?? proofType}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            <div>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Matched shortlist</h2>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {isLoading ? 'Loading…' : `${data?.matches.length ?? 0} matches`}
                </Badge>
              </div>

              {error ? (
                <Card className="rounded-2xl border border-border/60 p-6 text-sm text-destructive">{error}</Card>
              ) : isLoading ? (
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[280px] w-full rounded-[2rem]" />
                  ))}
                </div>
              ) : (data?.matches.length ?? 0) === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Target className="size-8" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">No shortlist matches yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Save candidates first in discovery, then come back here to rank them against a specific role profile.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/discover/saved">Open shortlist</Link>
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data?.matches.map((match) => (
                    <Card key={match.candidate.id} className="rounded-[2rem] border border-border/60 p-6 shadow-[0_20px_60px_rgba(2,8,23,0.06)]">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                              {match.matchScore}% role match
                            </Badge>
                            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                              {PROFESSION_LABELS[(match.candidate.primaryProfession ?? currentRole.profession) as ProofProfession] ?? match.candidate.primaryProfession ?? 'Multi-disciplinary'}
                            </Badge>
                          </div>

                          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{match.candidate.username}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {match.candidate.strongestProof
                              ? `Strongest proof: ${match.candidate.strongestProof.title}`
                              : 'No strongest proof available yet.'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {match.matchedTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                {tag}
                              </Badge>
                            ))}
                            {match.matchedTags.length === 0 ? (
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                No target tags matched yet
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid min-w-[260px] grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Profession</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.profession}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Skill tags</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.skillTags}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof types</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.proofTypes}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust + quality</p>
                            <p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.trust + match.breakdown.proofQuality}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {match.matchedProofTypes.map((proofType) => (
                          <Badge key={proofType} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                            {PROOF_TYPE_LABELS[proofType as ProofType] ?? proofType}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild>
                          <Link href={`/profile/${encodeURIComponent(match.candidate.username)}`}>View profile</Link>
                        </Button>
                        {match.candidate.strongestProof ? (
                          <Button asChild variant="outline">
                            <Link href={`/proof/${match.candidate.strongestProof.id}`}>
                              Review strongest proof
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

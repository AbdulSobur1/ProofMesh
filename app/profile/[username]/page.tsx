"use client"

import { useEffect, useMemo, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Code2, MapPin, PencilLine, ShieldCheck, Trophy, User, Zap } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { ProofCard } from '@/components/proof-card'
import { ReputationSection } from '@/components/reputation-section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProofCardSkeleton } from '@/components/dashboard/proof-card-skeleton'
import { StatsSkeleton } from '@/components/dashboard/stats-skeleton'
import { ProfileResponse, Reputation, ProofSortMode } from '@/lib/types'
import { filterProofs, getTimeline, sortProofs } from '@/lib/services/proof-analytics'
import { ProofControls } from '@/components/dashboard/proof-controls'
import { ReputationChart } from '@/components/dashboard/reputation-chart'
import { useProofs } from '@/lib/proof-context'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { currentUser } = useProofs()
  const resolvedParams = use(params)
  const username = decodeURIComponent(resolvedParams.username)
  const [data, setData] = useState<ProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [minScore, setMinScore] = useState(0)
  const [sortMode, setSortMode] = useState<ProofSortMode>('newest')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`)
        if (!res.ok) {
          throw new Error('Failed to load profile')
        }
        const payload = (await res.json()) as ProfileResponse
        setData(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [username])

  const reputation: Reputation = data?.reputation ?? {
    averageScore: 0,
    totalProofs: 0,
    tagFrequency: [],
    verifiedProofs: 0,
    averageConfidence: 0,
    endorsementCount: 0,
  }

  const proofs = useMemo(() => data?.proofs ?? [], [data])

  const filteredProofs = useMemo(() => {
    const tagFilter = selectedTag === 'all' ? null : selectedTag
    return sortProofs(filterProofs(proofs, { query, tag: tagFilter, minScore }), sortMode)
  }, [minScore, proofs, query, selectedTag, sortMode])

  const timeline = useMemo(() => getTimeline(proofs), [proofs])

  const getTier = (score: number) => {
    if (score >= 9) return { label: 'Expert', icon: Trophy }
    if (score >= 8) return { label: 'Advanced', icon: Code2 }
    if (score >= 7) return { label: 'Intermediate', icon: Zap }
    return { label: 'Beginner', icon: User }
  }

  const tier = getTier(reputation.averageScore)
  const TierIcon = tier.icon
  const profileUser = data?.user
  const profileName = profileUser?.displayName?.trim() || username.replace('-', ' ')
  const profileSubtitle =
    profileUser?.headline?.trim() ||
    [profileUser?.currentRole, profileUser?.currentCompany].filter(Boolean).join(' at ') ||
    'Public reputation profile'
  const isOwnProfile = currentUser?.username === username
  const profileInitial = (profileName[0] ?? username[0] ?? 'P').toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-20 items-center justify-center rounded-[1.5rem] border border-border/60 bg-background/70 text-primary shadow-sm">
                  <User className="size-10" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Verified public profile
                  </div>
                  <h1 className="mt-4 text-4xl font-semibold tracking-tight capitalize text-foreground sm:text-5xl">
                    {profileName}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {profileSubtitle}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5">
                      <TierIcon className="size-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{tier.label} level</span>
                    </div>
                    {profileUser?.location ? (
                      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-4 text-primary" />
                        {profileUser.location}
                      </div>
                    ) : null}
                    {profileUser?.currentRole || profileUser?.currentCompany ? (
                      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground">
                        <BriefcaseBusiness className="size-4 text-primary" />
                        {[profileUser?.currentRole, profileUser?.currentCompany].filter(Boolean).join(' at ')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <Button asChild variant="outline">
                    <Link href="/profile/edit" className="gap-2">
                      <PencilLine className="size-4" />
                      Edit profile
                    </Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href="/submit" className="gap-2">
                    Submit proof
                    <ArrowRight className="size-4" />
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

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-[1.5rem] border border-border/60 bg-background/70 text-2xl font-semibold text-primary shadow-sm">
                  {profileInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Professional snapshot</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {profileUser?.bio?.trim() || 'This profile has proof and reputation data, but the richer professional summary has not been filled out yet.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profileUser?.yearsExperience ? (
                      <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                        {profileUser.yearsExperience}+ years experience
                      </Badge>
                    ) : null}
                    {profileUser?.websiteUrl ? (
                      <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                        <a href={profileUser.websiteUrl} target="_blank" rel="noreferrer">
                          Personal website
                        </a>
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      @{username}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Top skill tags</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Most frequent across submitted proof.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {reputation.verifiedProofs} trusted
                </Badge>
              </div>
              {reputation.tagFrequency.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No tags yet.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {reputation.tagFrequency.map((tag) => (
                    <Badge key={tag.tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                      {tag.tag}
                      <span className="ml-1 text-xs text-muted-foreground">({tag.count})</span>
                    </Badge>
                  ))}
                </div>
              )}
            </Card>

            <ReputationChart timeline={timeline} />
          </div>

          <section className="mt-10">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Verified proofs</h2>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {filteredProofs.length} shown
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading proofs...'
                  : proofs.length === 0
                    ? 'No proofs submitted yet'
                    : `${proofs.length} proof${proofs.length !== 1 ? 's' : ''} submitted • ${reputation.verifiedProofs} trusted`}
              </p>
            </div>

            <ProofControls
              query={query}
              selectedTag={selectedTag}
              minScore={minScore}
              sortMode={sortMode}
              tags={reputation.tagFrequency}
              onQueryChange={setQuery}
              onTagChange={setSelectedTag}
              onMinScoreChange={setMinScore}
              onSortModeChange={setSortMode}
            />

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
            ) : filteredProofs.length === 0 ? (
              <Card className="rounded-[2rem] border-dashed border-2 border-border/60 p-12 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-muted/60">
                    <Code2 className="size-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No matching proofs</h3>
                <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                  Try adjusting your search or filters to find more proofs.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredProofs.map((proof) => (
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





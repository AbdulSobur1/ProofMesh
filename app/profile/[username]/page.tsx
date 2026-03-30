"use client"

import { useEffect, useMemo, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowRight, Award, BriefcaseBusiness, Check, Clock3, Code2, Copy, Download, Eye, GraduationCap, Mail, MapPin, PencilLine, ShieldCheck, Trophy, User, UserPlus, X, Zap } from 'lucide-react'
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
import { getTrustLabel, normalizeTrustLevel } from '@/lib/services/trust'

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
  const [networkActionError, setNetworkActionError] = useState<string | null>(null)
  const [isNetworkActionLoading, setIsNetworkActionLoading] = useState(false)
  const [shareState, setShareState] = useState<string | null>(null)

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
  const workExperiences = useMemo(() => data?.workExperiences ?? [], [data])
  const educations = useMemo(() => data?.educations ?? [], [data])
  const certifications = useMemo(() => data?.certifications ?? [], [data])
  const claimedSkills = useMemo(() => data?.claimedSkills ?? [], [data])
  const provenSkills = useMemo(() => data?.provenSkills ?? [], [data])

  const filteredProofs = useMemo(() => {
    const tagFilter = selectedTag === 'all' ? null : selectedTag
    return sortProofs(filterProofs(proofs, query, tagFilter, minScore), sortMode)
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
  const shortenedWallet = profileUser?.walletAddress
    ? `${profileUser.walletAddress.slice(0, 6)}...${profileUser.walletAddress.slice(-4)}`
    : null
  const claimedSkillSet = new Set(claimedSkills.map((entry) => entry.name.trim().toLowerCase()))
  const matchedClaimedSkills = claimedSkills.filter((entry) =>
    provenSkills.some((tag) => tag.tag.trim().toLowerCase() === entry.name.trim().toLowerCase())
  )
  const unmatchedClaimedSkills = claimedSkills.filter((entry) => !matchedClaimedSkills.some((match) => match.id === entry.id))
  const trustLevel = normalizeTrustLevel(profileUser?.trustLevel)
  const trustLabel = getTrustLabel(profileUser?.trustLevel)
  const hasVerifiedIdentity = Boolean(profileUser?.identityVerifiedAt)
  const trustBadgeClassName =
    trustLevel === 'verified'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : trustLevel === 'elevated'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
        : 'border-border/60 bg-background/60 text-muted-foreground'

  const runNetworkAction = async (input: {
    method: 'POST' | 'PATCH' | 'DELETE'
    url: string
    body?: Record<string, unknown>
  }) => {
    setIsNetworkActionLoading(true)
    setNetworkActionError(null)
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.body ? { 'Content-Type': 'application/json' } : undefined,
        body: input.body ? JSON.stringify(input.body) : undefined,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update connection')
      }

      const refreshed = await fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: 'no-store' })
      if (!refreshed.ok) {
        throw new Error('Failed to refresh profile')
      }
      setData((await refreshed.json()) as ProfileResponse)
    } catch (actionError) {
      setNetworkActionError(actionError instanceof Error ? actionError.message : 'Failed to update connection')
    } finally {
      setIsNetworkActionLoading(false)
    }
  }

  const profileUrl = typeof window !== 'undefined' ? window.location.href : `/profile/${encodeURIComponent(username)}`

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setShareState('Profile link copied')
    } catch {
      setShareState('Could not copy link')
    }
  }

  const downloadExport = async (format: 'json' | 'txt') => {
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(username)}/export?format=${format}`)
      if (!response.ok) {
        throw new Error('Failed to export profile')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${username}-reputation.${format === 'json' ? 'json' : 'txt'}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setShareState(format === 'json' ? 'JSON export downloaded' : 'Summary export downloaded')
    } catch {
      setShareState('Export failed')
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={trustBadgeClassName}>
                      <ShieldCheck className="mr-1 size-3.5" />
                      {trustLabel}
                    </Badge>
                    {hasVerifiedIdentity ? (
                      <Badge variant="secondary" className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        Identity confirmed
                      </Badge>
                    ) : null}
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
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground">
                      <UserPlus className="size-4 text-primary" />
                      {data?.networkCounts.totalConnections ?? 0} connection{(data?.networkCounts.totalConnections ?? 0) === 1 ? '' : 's'}
                    </div>
                    {shortenedWallet ? (
                      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground">
                        <ShieldCheck className="size-4 text-primary" />
                        Wallet {shortenedWallet}
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
                {!isOwnProfile && data?.viewerConnection.status === 'none' ? (
                  <Button onClick={() => runNetworkAction({ method: 'POST', url: '/api/network', body: { targetUsername: username } })} disabled={isNetworkActionLoading}>
                    <UserPlus className="size-4" />
                    Connect
                  </Button>
                ) : null}
                {!isOwnProfile && data?.viewerConnection.status === 'pending_incoming' && data.viewerConnection.connectionId ? (
                  <>
                    <Button onClick={() => runNetworkAction({ method: 'PATCH', url: `/api/network/${encodeURIComponent(data.viewerConnection.connectionId!)}`, body: { action: 'accept' } })} disabled={isNetworkActionLoading}>
                      <Check className="size-4" />
                      Accept request
                    </Button>
                    <Button variant="outline" onClick={() => runNetworkAction({ method: 'PATCH', url: `/api/network/${encodeURIComponent(data.viewerConnection.connectionId!)}`, body: { action: 'decline' } })} disabled={isNetworkActionLoading}>
                      <X className="size-4" />
                      Decline
                    </Button>
                  </>
                ) : null}
                {!isOwnProfile && data?.viewerConnection.status === 'pending_outgoing' && data.viewerConnection.connectionId ? (
                  <Button variant="outline" onClick={() => runNetworkAction({ method: 'PATCH', url: `/api/network/${encodeURIComponent(data.viewerConnection.connectionId!)}`, body: { action: 'cancel' } })} disabled={isNetworkActionLoading}>
                    <Clock3 className="size-4" />
                    Request sent
                  </Button>
                ) : null}
                {!isOwnProfile && data?.viewerConnection.status === 'connected' && data.viewerConnection.connectionId ? (
                  <>
                    <Button asChild>
                      <Link href={`/messages?user=${encodeURIComponent(username)}`}>
                        <Mail className="size-4" />
                        Message
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => runNetworkAction({ method: 'DELETE', url: `/api/network/${encodeURIComponent(data.viewerConnection.connectionId!)}` })} disabled={isNetworkActionLoading}>
                      <Check className="size-4" />
                      Connected
                    </Button>
                  </>
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
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {trustLabel}
                    </Badge>
                    {shortenedWallet ? (
                      <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                        {shortenedWallet}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              {networkActionError ? (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {networkActionError}
                </div>
              ) : null}
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

            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Shareable reputation card</h3>
                  <p className="mt-1 text-sm text-muted-foreground">A compact public snapshot for recruiters, clients, and peers.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  Public
                </Badge>
              </div>
              <div className="mt-5 rounded-[1.75rem] border border-border/60 bg-[linear-gradient(135deg,rgba(79,140,255,0.12),rgba(255,255,255,0.02))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{profileName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{profileSubtitle}</p>
                  </div>
                  <Badge variant="secondary" className={trustBadgeClassName}>
                    {trustLabel}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Score</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reputation.averageScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verified proofs</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reputation.verifiedProofs}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Endorsements</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{reputation.endorsementCount}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {reputation.tagFrequency.slice(0, 5).map((tag) => (
                    <Badge key={tag.tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void copyProfileLink()}>
                  <Copy className="size-4" />
                  Copy profile link
                </Button>
                <Button variant="outline" onClick={() => void downloadExport('txt')}>
                  <Download className="size-4" />
                  Export summary
                </Button>
                <Button variant="outline" onClick={() => void downloadExport('json')}>
                  <Download className="size-4" />
                  Export JSON
                </Button>
              </div>
              {shareState ? <p className="mt-3 text-xs text-muted-foreground">{shareState}</p> : null}
            </Card>

            <ReputationChart data={timeline} />
          </div>

          {isOwnProfile ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <Card className="rounded-[2rem] border-border/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Profile view signals</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Private visibility into who is finding you.</p>
                  </div>
                  <Eye className="size-5 text-primary" />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total views</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.profileAnalytics.totalViews ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Unique viewers</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.profileAnalytics.uniqueViewers ?? 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-border/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Recent viewers</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Signed-in people who recently opened your profile.</p>
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                    {data?.profileAnalytics.recentViewers.length ?? 0}
                  </Badge>
                </div>
                {(data?.profileAnalytics.recentViewers.length ?? 0) === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">No signed-in profile viewers yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {data?.profileAnalytics.recentViewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 p-4">
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
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Career experience</h3>
                  <p className="mt-1 text-sm text-muted-foreground">The timeline behind the proof.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {workExperiences.length} role{workExperiences.length === 1 ? '' : 's'}
                </Badge>
              </div>
              {workExperiences.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No experience added yet.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {workExperiences.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <BriefcaseBusiness className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-foreground">{entry.title}</h4>
                            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                              {entry.company}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[entry.location, `${entry.startDate} - ${entry.isCurrent ? 'Present' : entry.endDate || 'Present'}`].filter(Boolean).join(' • ')}
                          </p>
                          {entry.description ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Claimed vs proven skills</h3>
                  <p className="mt-1 text-sm text-muted-foreground">What this person says they do versus what the proof history supports.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {matchedClaimedSkills.length}/{claimedSkills.length} supported
                </Badge>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Claimed skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claimedSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No claimed skills added yet.</p>
                    ) : (
                      claimedSkills.map((entry) => {
                        const matched = claimedSkillSet.has(entry.name.trim().toLowerCase()) &&
                          provenSkills.some((tag) => tag.tag.trim().toLowerCase() === entry.name.trim().toLowerCase())

                        return (
                          <Badge
                            key={entry.id}
                            variant="secondary"
                            className={
                              matched
                                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                            }
                          >
                            {entry.name}
                          </Badge>
                        )
                      })
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proven from proof</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {provenSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No proven skills extracted yet.</p>
                    ) : (
                      provenSkills.slice(0, 10).map((tag) => (
                        <Badge key={tag.tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                          {tag.tag}
                          <span className="ml-1 text-xs text-muted-foreground">({tag.count})</span>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                {unmatchedClaimedSkills.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Some claimed skills are not yet supported by submitted proof. That gives this profile room to become more credible over time.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Education</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Formal learning and academic background.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {educations.length} entr{educations.length === 1 ? 'y' : 'ies'}
                </Badge>
              </div>
              {educations.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No education added yet.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {educations.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <GraduationCap className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-semibold text-foreground">{entry.school}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[entry.degree, entry.fieldOfStudy].filter(Boolean).join(' • ')}
                          </p>
                          {(entry.startDate || entry.endDate) ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[entry.startDate, entry.endDate].filter(Boolean).join(' - ')}
                            </p>
                          ) : null}
                          {entry.description ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-[2rem] border-border/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Certifications</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Credentials that reinforce the proof-backed profile.</p>
                </div>
                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                  {certifications.length} cert{certifications.length === 1 ? '' : 's'}
                </Badge>
              </div>
              {certifications.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No certifications added yet.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {certifications.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Award className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-foreground">{entry.name}</h4>
                            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                              {entry.issuer}
                            </Badge>
                          </div>
                          {entry.issueDate ? (
                            <p className="mt-1 text-sm text-muted-foreground">Issued {entry.issueDate}</p>
                          ) : null}
                          {entry.credentialUrl ? (
                            <a href={entry.credentialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                              View credential
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
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





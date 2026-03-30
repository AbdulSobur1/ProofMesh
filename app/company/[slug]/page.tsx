'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Building2, Globe, MapPin, Newspaper, PlusCircle, Users } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { CompanyResponse } from '@/lib/types'
import { PROFESSION_LABELS, type ProofProfession } from '@/lib/proof-taxonomy'

interface CompanyPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function CompanyPublicPage({ params }: CompanyPageProps) {
  const resolved = use(params)
  const slug = decodeURIComponent(resolved.slug)
  const [data, setData] = useState<CompanyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/companies/${encodeURIComponent(slug)}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load company')
        }
        const payload = (await response.json()) as CompanyResponse
        setData(payload)
        setIsFollowing(payload.viewerState.isFollowing)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [slug])

  const company = data?.company
  const jobs = data?.jobs ?? []
  const posts = data?.posts ?? []

  const toggleFollow = async () => {
    if (!company) return

    try {
      setError(null)
      const response = await fetch(`/api/companies/${encodeURIComponent(company.slug)}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update follow state')
      }

      setIsFollowing((current) => !current)
      setData((current) =>
        current
          ? {
              ...current,
              analytics: {
                ...current.analytics,
                followerCount: current.analytics.followerCount + (isFollowing ? -1 : 1),
              },
            }
          : current
      )
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'Failed to update follow state')
    }
  }

  const publishPost = async () => {
    if (!company || !draft.trim()) return

    setIsPosting(true)
    setError(null)
    try {
      const response = await fetch(`/api/companies/${encodeURIComponent(company.slug)}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: draft.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to publish company post')
      }

      setDraft('')
      setData((current) =>
        current
          ? {
              ...current,
              posts: [payload.post, ...current.posts],
              analytics: {
                ...current.analytics,
                postCount: current.analytics.postCount + 1,
              },
            }
          : current
      )
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Failed to publish company post')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          {error ? (
            <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : isLoading ? (
            <Skeleton className="h-64 w-full rounded-[2rem]" />
          ) : !company ? (
            <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
              Company not found.
            </Card>
          ) : (
            <>
              <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
                <div className="relative flex items-start gap-4">
                  <div className="flex size-20 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
                    <Building2 className="size-10" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-4xl font-semibold tracking-tight text-foreground">{company.name}</h1>
                      {company.industry ? (
                        <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                          {company.industry}
                        </Badge>
                      ) : null}
                    </div>
                    {company.tagline ? (
                      <p className="mt-3 text-base text-muted-foreground">{company.tagline}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {company.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-primary" />
                          {company.location}
                        </div>
                      ) : null}
                      {company.websiteUrl ? (
                        <a href={company.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                          <Globe className="size-4" />
                          Website
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                        {data?.analytics.followerCount ?? 0} follower{(data?.analytics.followerCount ?? 0) === 1 ? '' : 's'}
                      </Badge>
                      <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                        {data?.analytics.postCount ?? 0} post{(data?.analytics.postCount ?? 0) === 1 ? '' : 's'}
                      </Badge>
                      <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                        {data?.analytics.jobCount ?? 0} job{(data?.analytics.jobCount ?? 0) === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    {company.description ? (
                      <p className="mt-6 max-w-3xl text-sm leading-7 text-foreground/85">{company.description}</p>
                    ) : null}
                    <div className="mt-6 flex flex-wrap gap-3">
                      {data?.viewerState.canManage ? (
                        <Button asChild variant="outline">
                          <Link href="/company">Manage company</Link>
                        </Button>
                      ) : (
                        <Button onClick={toggleFollow} variant={isFollowing ? 'outline' : 'default'}>
                          <Users className="size-4" />
                          {isFollowing ? 'Following' : 'Follow company'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-[2rem] border border-border/60 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Company updates</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Posts from the team, hiring updates, and public company activity.</p>
                    </div>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {posts.length} posts
                    </Badge>
                  </div>

                  {posts.length === 0 ? (
                    <Card className="mt-5 rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                      No company posts yet.
                    </Card>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {posts.map((post) => (
                        <Card key={post.id} className="rounded-[2rem] border border-border/60 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{post.author.displayName || post.author.username}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {post.author.headline || [post.author.currentRole, post.author.currentCompany].filter(Boolean).join(' at ') || `@${post.author.username}`}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-foreground/85">{post.body}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>

                <div className="space-y-6">
                  {data?.viewerState.canManage ? (
                    <Card className="rounded-[2rem] border border-border/60 p-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <PlusCircle className="size-4 text-primary" />
                        Publish company post
                      </div>
                      <div className="mt-4 space-y-4">
                        <Textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          rows={5}
                          placeholder="Share a hiring update, product launch, team win, or company milestone..."
                        />
                        <Button onClick={publishPost} disabled={isPosting || !draft.trim()} className="w-full">
                          {isPosting ? 'Publishing...' : 'Publish update'}
                        </Button>
                      </div>
                    </Card>
                  ) : null}

                  <Card className="rounded-[2rem] border border-border/60 p-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Newspaper className="size-4 text-primary" />
                      Company visibility
                    </div>
                    <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                      <p>Followers can track this company as it posts updates and opens new roles.</p>
                      <p>Company posts create a clearer employer narrative than jobs alone, especially for trust and brand-building.</p>
                      <p>Over time this becomes the employer-side equivalent of a professional feed.</p>
                    </div>
                  </Card>
                </div>
              </div>

              <section className="mt-8">
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Open roles</h2>
                  <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                    {jobs.length} jobs
                  </Badge>
                </div>

                {jobs.length === 0 ? (
                  <Card className="rounded-[2rem] border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                    No jobs published yet.
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <Card key={job.id} className="rounded-[2rem] border border-border/60 p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                {PROFESSION_LABELS[job.profession as ProofProfession] ?? job.profession}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{job.description}</p>
                          </div>
                          <Button asChild>
                            <Link href="/jobs">Apply via jobs board</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookmarkPlus, BriefcaseBusiness, Building2, Search, Sparkles, Users } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CandidateCard } from '@/components/discovery/candidate-card'
import { Button } from '@/components/ui/button'
import { CandidateJobPost, DiscoveryCandidate, SavedSearchRecord, SavedSearchesResponse, SearchProofResult, SearchResultsResponse, SearchSkillResult } from '@/lib/types'
import { PROFESSION_LABELS, type ProofProfession } from '@/lib/proof-taxonomy'

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [resultType, setResultType] = useState('all')
  const [proofType, setProofType] = useState('')
  const [sourceCategory, setSourceCategory] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minConfidence, setMinConfidence] = useState(0)
  const [results, setResults] = useState<SearchResultsResponse | null>(null)
  const [savedSearches, setSavedSearches] = useState<SavedSearchRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingSearch, setIsSavingSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSavedSearches = useCallback(async () => {
    try {
      const response = await fetch('/api/search/saved', { cache: 'no-store' })
      if (!response.ok) {
        return
      }
      const payload = (await response.json()) as SavedSearchesResponse
      setSavedSearches(payload.searches)
    } catch {
      setSavedSearches([])
    }
  }, [])

  const load = useCallback(async (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim()
    setSubmittedQuery(trimmedQuery)

    if (!trimmedQuery) {
      setResults({
        query: '',
        candidates: [],
        companies: [],
        jobs: [],
        proofs: [],
        skills: [],
      })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const searchParams = new URLSearchParams({ q: trimmedQuery, resultType })
      if (proofType) searchParams.set('proofType', proofType)
      if (sourceCategory) searchParams.set('sourceCategory', sourceCategory)
      if (verifiedOnly) searchParams.set('verifiedOnly', 'true')
      if (minConfidence > 0) searchParams.set('minConfidence', String(minConfidence))

      const response = await fetch(`/api/search?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to search')
      }
      const payload = (await response.json()) as SearchResultsResponse
      setResults(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [minConfidence, proofType, resultType, sourceCategory, verifiedOnly])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(query)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [load, query])

  useEffect(() => {
    void loadSavedSearches()
  }, [loadSavedSearches])

  const candidates = useMemo(() => results?.candidates ?? [], [results])
  const companies = useMemo(() => results?.companies ?? [], [results])
  const jobs = useMemo(() => results?.jobs ?? [], [results])
  const proofs = useMemo(() => results?.proofs ?? [], [results])
  const skills = useMemo(() => results?.skills ?? [], [results])
  const resultCount = candidates.length + companies.length + jobs.length + proofs.length + skills.length
  const proofTypeOptions = useMemo(() => {
    const values = new Set<string>()
    proofs.forEach((proof) => values.add(proof.proofType))
    return Array.from(values).sort()
  }, [proofs])
  const isSaved = useMemo(
    () => savedSearches.some((search) => search.query.toLowerCase() === submittedQuery.toLowerCase()),
    [savedSearches, submittedQuery]
  )

  const noopToggleSave = async (_candidate: DiscoveryCandidate) => {}

  const saveSearch = async () => {
    const trimmedQuery = submittedQuery.trim()
    if (!trimmedQuery) return

    setIsSavingSearch(true)
    setError(null)
    try {
      const response = await fetch('/api/search/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save search')
      }
      await loadSavedSearches()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save search')
    } finally {
      setIsSavingSearch(false)
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
                <Search className="size-6" />
              </div>
              <div className="w-full">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Global search</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Search people, companies, jobs, proofs, and skill evidence.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This is the cross-platform lookup layer: instead of hopping page to page, you can now search the whole proof-backed network from one place.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search for product design, React, growth marketing, Acme, backend engineer..."
                    className="h-12 bg-background/80"
                  />
                  <Button
                    type="button"
                    variant={isSaved ? 'outline' : 'default'}
                    onClick={saveSearch}
                    disabled={!submittedQuery.trim() || isSavingSearch || isSaved}
                  >
                    <BookmarkPlus className="size-4" />
                    {isSaved ? 'Saved' : isSavingSearch ? 'Saving...' : 'Save search'}
                  </Button>
                  <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                    {isLoading ? 'Searching…' : `${resultCount} results`}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[180px_180px_180px_160px_1fr]">
                  <select
                    value={resultType}
                    onChange={(event) => setResultType(event.target.value)}
                    className="h-11 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground outline-none"
                  >
                    <option value="all">All results</option>
                    <option value="people">People</option>
                    <option value="companies">Companies</option>
                    <option value="jobs">Jobs</option>
                    <option value="proofs">Proofs</option>
                    <option value="skills">Skills</option>
                  </select>
                  <select
                    value={proofType}
                    onChange={(event) => setProofType(event.target.value)}
                    className="h-11 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Any proof type</option>
                    {proofTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sourceCategory}
                    onChange={(event) => setSourceCategory(event.target.value)}
                    className="h-11 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground outline-none"
                  >
                    <option value="">Any evidence type</option>
                    <option value="general">General</option>
                    <option value="github">GitHub</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="case_study">Case study</option>
                    <option value="document">Document</option>
                    <option value="presentation">Presentation</option>
                  </select>
                  <select
                    value={minConfidence}
                    onChange={(event) => setMinConfidence(Number(event.target.value))}
                    className="h-11 rounded-xl border border-border/60 bg-background/80 px-3 text-sm text-foreground outline-none"
                  >
                    <option value={0}>Any confidence</option>
                    <option value={50}>50%+</option>
                    <option value={65}>65%+</option>
                    <option value={80}>80%+</option>
                    <option value={90}>90%+</option>
                  </select>
                  <label className="flex h-11 items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-4 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(event) => setVerifiedOnly(event.target.checked)}
                      className="size-4 rounded border-border/60"
                    />
                    Verified confidence only
                  </label>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          {!submittedQuery ? (
            <Card className="mt-6 rounded-[2rem] border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              Start typing to search across the whole platform.
            </Card>
          ) : isLoading ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-[2rem]" />
              ))}
            </div>
          ) : resultCount === 0 ? (
            <Card className="mt-6 rounded-[2rem] border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No results found for &quot;{submittedQuery}&quot;. Try a broader skill, company, or profession term.
            </Card>
          ) : (
            <div className="mt-6 space-y-8">
              {savedSearches.length > 0 ? (
                <Card className="rounded-[2rem] border border-border/60 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Saved searches</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Pinned queries you want to revisit and track.</p>
                    </div>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {savedSearches.length}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {savedSearches.map((search) => (
                      <button
                        key={search.id}
                        type="button"
                        onClick={() => setQuery(search.query)}
                        className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                      >
                        {search.query}
                        {search.newResultDelta > 0 ? ` • +${search.newResultDelta}` : ''}
                      </button>
                    ))}
                  </div>
                </Card>
              ) : null}

              {candidates.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <Users className="size-5 text-primary" />
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">People</h2>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {candidates.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4">
                    {candidates.map((candidate) => (
                      <CandidateCard key={candidate.id} candidate={candidate} onToggleSave={noopToggleSave} />
                    ))}
                  </div>
                </section>
              ) : null}

              {companies.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <Building2 className="size-5 text-primary" />
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Companies</h2>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {companies.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {companies.map((company) => (
                      <Card key={company.id} className="rounded-[2rem] border border-border/60 p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{company.name}</h3>
                            {company.tagline ? (
                              <p className="mt-2 text-sm text-muted-foreground">{company.tagline}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {company.industry ? (
                                <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {company.industry}
                                </Badge>
                              ) : null}
                              {company.location ? (
                                <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                  {company.location}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <Button asChild variant="outline">
                            <Link href={`/company/${encodeURIComponent(company.slug)}`}>Open</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}

              {jobs.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <BriefcaseBusiness className="size-5 text-primary" />
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Jobs</h2>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {jobs.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {jobs.map((job: CandidateJobPost) => (
                      <Card key={job.id} className="rounded-[2rem] border border-border/60 p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {job.company?.name ? `${job.company.name} • ` : ''}
                              {PROFESSION_LABELS[job.profession as ProofProfession] ?? job.profession}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {job.targetTags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button asChild variant="outline">
                            <Link href="/jobs">View</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}

              {proofs.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <Sparkles className="size-5 text-primary" />
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Proofs</h2>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {proofs.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {proofs.map((proof: SearchProofResult) => (
                      <Card key={proof.id} className="rounded-[2rem] border border-border/60 p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{proof.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {proof.owner.displayName || proof.owner.username} • {proof.score}/10 • {formatDate(proof.createdAt)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                {proof.sourceCategory.replaceAll('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                {proof.verificationConfidence}% confidence
                              </Badge>
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                {proof.endorsementCount} endorsement{proof.endorsementCount === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{proof.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {proof.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button asChild variant="outline">
                            <Link href={`/proof/${encodeURIComponent(proof.id)}`}>Open</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}

              {skills.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <Search className="size-5 text-primary" />
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Proof-backed skills</h2>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {skills.length}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {skills.map((skill: SearchSkillResult) => (
                      <Card key={skill.name} className="rounded-[2rem] border border-border/60 p-6">
                        <h3 className="text-xl font-semibold text-foreground">{skill.name}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {skill.candidateCount} candidate{skill.candidateCount === 1 ? '' : 's'} • {skill.proofCount} proof{skill.proofCount === 1 ? '' : 's'}
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Top matches: {skill.topCandidates.join(', ')}
                        </p>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

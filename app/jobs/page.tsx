'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Send } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { CandidateJobPost, CandidateJobsResponse, Proof } from '@/lib/types'
import { PROFESSION_LABELS, type ProofProfession } from '@/lib/proof-taxonomy'
import { useProofs } from '@/lib/proof-context'

export default function JobsBoardPage() {
  const { proofs } = useProofs()
  const [jobs, setJobs] = useState<CandidateJobPost[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [selectedProofId, setSelectedProofId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/jobs/candidate', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load jobs')
      }
      const payload = (await response.json()) as CandidateJobsResponse
      setJobs(payload.jobs)
      setSelectedJobId((current) => current ?? payload.jobs[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  )

  const apply = async () => {
    if (!selectedJob) return

    setIsApplying(true)
    setError(null)
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(selectedJob.id)}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note,
          selectedProofId: selectedProofId || undefined,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to apply')
      }

      setNote('')
      setSelectedProofId('')
      await loadJobs()
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Failed to apply')
    } finally {
      setIsApplying(false)
    }
  }

  const selectableProofs = useMemo(() => proofs.slice(0, 16), [proofs])

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
                <BriefcaseBusiness className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Jobs board</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Apply to roles with real proof, not empty claims.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  This is the first hiring workflow for candidates: browse live custom roles and apply with proof-backed context recruiters can actually trust.
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <h2 className="text-lg font-semibold text-foreground">Available jobs</h2>
              {isLoading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No jobs available yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        selectedJobId === job.id
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-border/60 bg-background/70 hover:border-primary/20'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      {job.company ? (
                        <p className="mt-1 text-xs font-medium text-foreground/85">{job.company.name}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {PROFESSION_LABELS[job.profession as ProofProfession] ?? job.profession}
                      </p>
                      {job.hasApplied ? (
                        <Badge variant="secondary" className="mt-2 border border-border/60 bg-background/70 text-foreground">
                          Applied • {job.applicationStatus}
                        </Badge>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-[2rem] border border-border/60 p-6">
              {isLoading ? (
                <Skeleton className="h-[520px] w-full rounded-[2rem]" />
              ) : !selectedJob ? (
                <div className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
                  Select a job to review the role and apply.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{selectedJob.title}</h2>
                      {selectedJob.company ? (
                        <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                          {selectedJob.company.name}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                        {PROFESSION_LABELS[selectedJob.profession as ProofProfession] ?? selectedJob.profession}
                      </Badge>
                    </div>
                    {selectedJob.company?.tagline ? (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedJob.company.tagline}</p>
                    ) : null}
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{selectedJob.description}</p>
                    {selectedJob.company ? (
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/company/${encodeURIComponent(selectedJob.company.slug)}`}>View company page</Link>
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Target tags</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedJob.targetTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof preferences</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedJob.preferredProofTypes.map((proofType) => (
                          <Badge key={proofType} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                            {proofType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Proof-backed application</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Attach one proof and a short note explaining your fit.</p>
                      </div>
                      {selectedJob.hasApplied ? (
                        <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                          Current status: {selectedJob.applicationStatus}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-4">
                      <select
                        value={selectedProofId}
                        onChange={(event) => setSelectedProofId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
                      >
                        <option value="">Select a proof to attach</option>
                        {selectableProofs.map((proof: Proof) => (
                          <option key={proof.id} value={proof.id}>
                            {proof.title}
                          </option>
                        ))}
                      </select>

                      <Textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={5}
                        placeholder="Explain why you fit this role, what proof best represents your work, and what outcomes you’ve delivered."
                      />

                      <div className="flex justify-end">
                        <Button onClick={apply} disabled={isApplying}>
                          <Send className="size-4" />
                          {selectedJob.hasApplied ? 'Update application' : 'Apply now'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, PlusCircle, Target, Users } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PROFESSION_LABELS, PROOF_PROFESSIONS, PROOF_TYPE_LABELS, PROOF_TYPES, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'
import { CompanyProfile, JobApplication, JobApplicationsResponse, JobInterviewStage, JobMatchResponse, JobPost, JobPostsResponse } from '@/lib/types'

const INTERVIEW_STAGE_OPTIONS: Array<{ value: JobInterviewStage; label: string }> = [
  { value: 'application_review', label: 'Application review' },
  { value: 'intro_call', label: 'Intro call' },
  { value: 'skills_interview', label: 'Skills interview' },
  { value: 'final_interview', label: 'Final interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
]

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [matchData, setMatchData] = useState<JobMatchResponse | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [isLoadingApplications, setIsLoadingApplications] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [draftStages, setDraftStages] = useState<Record<string, JobInterviewStage | ''>>({})
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    profession: 'software_engineering' as ProofProfession,
    targetTags: '',
    preferredProofTypes: ['project'] as ProofType[],
    minScore: '7',
  })

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true)
    setError(null)
    try {
      const response = await fetch('/api/jobs', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load job posts')
      const payload = (await response.json()) as JobPostsResponse
      setJobs(payload.jobs)
      setSelectedJobId((current) => current ?? payload.jobs[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
    } finally {
      setIsLoadingJobs(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await fetch('/api/companies', { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as { company: CompanyProfile | null }
        setCompany(payload.company)
      } catch {
        setCompany(null)
      }
    }

    loadCompany()
  }, [])

  useEffect(() => {
    const loadMatches = async () => {
      if (!selectedJobId) {
        setMatchData(null)
        return
      }

      setIsLoadingMatches(true)
      setError(null)
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(selectedJobId)}/matches`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load candidate matches')
        const payload = (await response.json()) as JobMatchResponse
        setMatchData(payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoadingMatches(false)
      }
    }

    loadMatches()
  }, [selectedJobId])

  useEffect(() => {
    const loadApplications = async () => {
      if (!selectedJobId) {
        setApplications([])
        return
      }

      setIsLoadingApplications(true)
      setError(null)
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(selectedJobId)}/applications`, {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Failed to load applications')
        const payload = (await response.json()) as JobApplicationsResponse
        setApplications(payload.applications)
        setDraftNotes(
          Object.fromEntries(payload.applications.map((application) => [application.id, application.recruiterNotes ?? '']))
        )
        setDraftStages(
          Object.fromEntries(payload.applications.map((application) => [application.id, application.interviewStage ?? '']))
        )
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoadingApplications(false)
      }
    }

    loadApplications()
  }, [selectedJobId])

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId])

  const toggleProofType = (proofType: ProofType) => {
    setForm((current) => ({
      ...current,
      preferredProofTypes: current.preferredProofTypes.includes(proofType)
        ? current.preferredProofTypes.filter((item) => item !== proofType)
        : [...current.preferredProofTypes, proofType],
    }))
  }

  const handleCreateJob = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)
    setFormError(null)

    try {
      const targetTags = form.targetTags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          profession: form.profession,
          targetTags,
          preferredProofTypes: form.preferredProofTypes,
          minScore: Number(form.minScore),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to create job')
      }

      const createdJob = payload.job as JobPost
      setJobs((current) => [createdJob, ...current])
      setSelectedJobId(createdJob.id)
      setForm({
        title: '',
        description: '',
        profession: 'software_engineering',
        targetTags: '',
        preferredProofTypes: ['project'],
        minScore: '7',
      })
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : 'Failed to create job')
    } finally {
      setIsCreating(false)
    }
  }

  const updateApplicationStatus = async (
    applicationId: string,
    status: 'submitted' | 'reviewing' | 'shortlisted' | 'rejected',
    options?: { recruiterNotes?: string; interviewStage?: JobInterviewStage | '' }
  ) => {
    if (!selectedJobId) return

    setUpdatingApplicationId(applicationId)
    setError(null)
    try {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(selectedJobId)}/applications/${encodeURIComponent(applicationId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            recruiterNotes: options?.recruiterNotes,
            interviewStage: options?.interviewStage === '' ? null : options?.interviewStage,
          }),
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update application')
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId ? payload.application : application
        )
      )
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update application')
    } finally {
      setUpdatingApplicationId(null)
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
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <BriefcaseBusiness className="size-3.5 text-primary" />
                  Custom jobs workspace
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Create custom roles and match your shortlist against them.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Turn recruiter intent into structured job profiles with target tags, preferred proof formats, and minimum quality thresholds.
                </p>
                {company ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Building2 className="size-3.5 text-primary" />
                    Hiring as {company.name}
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/company">Set up company profile</Link>
                    </Button>
                  </div>
                )}
                {company ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/company/${encodeURIComponent(company.slug)}`}>Open company page</Link>
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/discover/match" className="gap-2">
                    <Target className="size-4" />
                    Open preset matching
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/discover/saved" className="gap-2">
                    <ArrowLeft className="size-4" />
                    Back to shortlist
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[380px_260px_minmax(0,1fr)]">
            <Card className="rounded-[2rem] border border-border/60 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PlusCircle className="size-4 text-primary" />
                Create job post
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleCreateJob}>
                {formError ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</div> : null}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Role title</label>
                  <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Senior Product Marketer" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={6} placeholder="Describe the role, outcomes, and the type of proof you expect to see." required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Primary profession</label>
                  <select value={form.profession} onChange={(e) => setForm((prev) => ({ ...prev, profession: e.target.value as ProofProfession }))} className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none">
                    {PROOF_PROFESSIONS.map((profession) => (
                      <option key={profession} value={profession}>{PROFESSION_LABELS[profession]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Target tags</label>
                  <Input value={form.targetTags} onChange={(e) => setForm((prev) => ({ ...prev, targetTags: e.target.value }))} placeholder="growth, positioning, analytics, campaign" />
                  <p className="mt-2 text-xs text-muted-foreground">Separate tags with commas.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Preferred proof types</label>
                  <div className="flex flex-wrap gap-2">
                    {PROOF_TYPES.map((proofType) => {
                      const active = form.preferredProofTypes.includes(proofType)
                      return (
                        <Button key={proofType} type="button" size="sm" variant={active ? 'default' : 'outline'} onClick={() => toggleProofType(proofType)}>
                          {PROOF_TYPE_LABELS[proofType]}
                        </Button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Minimum average score</label>
                  <select value={form.minScore} onChange={(e) => setForm((prev) => ({ ...prev, minScore: e.target.value }))} className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none">
                    <option value="6">6.0+</option>
                    <option value="7">7.0+</option>
                    <option value="7.5">7.5+</option>
                    <option value="8">8.0+</option>
                    <option value="9">9.0+</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? 'Creating job...' : 'Create job post'}
                </Button>
              </form>
            </Card>

            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-sm font-semibold text-foreground">Your jobs</p>
              {isLoadingJobs ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No jobs yet. Create one to start matching candidates.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {jobs.map((job) => (
                    <button key={job.id} type="button" onClick={() => setSelectedJobId(job.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedJobId === job.id ? 'border-primary/30 bg-primary/10' : 'border-border/60 bg-background/70 hover:border-primary/20'}`}>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{PROFESSION_LABELS[job.profession as ProofProfession] ?? job.profession}</p>
                      {job.company ? (
                        <p className="mt-1 text-xs text-muted-foreground">{job.company.name}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <div>
              <div className="mb-5 flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Custom job matches</h2>
                {selectedJob ? (
                  <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">{selectedJob.title}</Badge>
                ) : null}
              </div>

              {error ? (
                <Card className="rounded-2xl border border-border/60 p-6 text-sm text-destructive">{error}</Card>
              ) : isLoadingMatches ? (
                <div className="grid gap-4">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[280px] w-full rounded-[2rem]" />)}
                </div>
              ) : !selectedJob ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                  <h3 className="text-lg font-semibold text-foreground">Select a job</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a custom job from the left to see ranked shortlist matches.</p>
                </Card>
              ) : !matchData || matchData.matches.length === 0 ? (
                <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                  <h3 className="text-lg font-semibold text-foreground">No candidates matched yet</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Save more candidates or broaden the job requirements to generate stronger matches.</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {matchData.matches.map((match) => (
                    <Card key={match.candidate.id} className="rounded-[2rem] border border-border/60 p-6 shadow-[0_20px_60px_rgba(2,8,23,0.06)]">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">{match.matchScore}% match</Badge>
                            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">{PROFESSION_LABELS[(match.candidate.primaryProfession ?? selectedJob.profession) as ProofProfession] ?? match.candidate.primaryProfession ?? 'Multi-disciplinary'}</Badge>
                            {selectedJob.company ? (
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                {selectedJob.company.name}
                              </Badge>
                            ) : null}
                          </div>
                          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{match.candidate.username}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{match.candidate.strongestProof ? `Strongest proof: ${match.candidate.strongestProof.title}` : 'No strongest proof available yet.'}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {match.matchedTags.map((tag) => <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">{tag}</Badge>)}
                            {match.matchedTags.length === 0 ? <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">No target tags matched yet</Badge> : null}
                          </div>
                        </div>
                        <div className="grid min-w-[260px] grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Profession</p><p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.profession}</p></div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Skill tags</p><p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.skillTags}</p></div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof types</p><p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.proofTypes}</p></div>
                          <div className="rounded-2xl border border-border/60 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trust + quality</p><p className="mt-2 text-lg font-semibold text-foreground">{match.breakdown.trust + match.breakdown.proofQuality}</p></div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {match.matchedProofTypes.map((proofType) => <Badge key={proofType} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">{PROOF_TYPE_LABELS[proofType as ProofType] ?? proofType}</Badge>)}
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild><Link href={`/profile/${encodeURIComponent(match.candidate.username)}`}>View profile</Link></Button>
                        {match.candidate.strongestProof ? <Button asChild variant="outline"><Link href={`/proof/${match.candidate.strongestProof.id}`}>Review strongest proof<ArrowRight className="size-4" /></Link></Button> : null}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="mt-10">
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Applicants</h2>
                  {selectedJob ? (
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                      {applications.length} total
                    </Badge>
                  ) : null}
                </div>

                {isLoadingApplications ? (
                  <div className="grid gap-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-[240px] w-full rounded-[2rem]" />
                    ))}
                  </div>
                ) : !selectedJob ? (
                  <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                    <p className="text-sm text-muted-foreground">Select a job to review applicants.</p>
                  </Card>
                ) : applications.length === 0 ? (
                  <Card className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="size-8" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-foreground">No applications yet</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Applications will appear here once candidates start applying with proof-backed context.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {applications.map((application) => (
                      <Card key={application.id} className="rounded-[2rem] border border-border/60 p-6 shadow-[0_20px_60px_rgba(2,8,23,0.06)]">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                                {application.applicant.displayName || application.applicant.username}
                              </h3>
                              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                                @{application.applicant.username}
                              </Badge>
                              <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                {application.status}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {application.applicant.headline || [application.applicant.currentRole, application.applicant.currentCompany].filter(Boolean).join(' at ') || 'Proof-backed candidate'}
                            </p>
                            {application.note ? (
                              <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Candidate note</p>
                                <p className="mt-2 text-sm leading-6 text-foreground/85">{application.note}</p>
                              </div>
                            ) : null}
                            <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recruiter pipeline</p>
                                {application.interviewStage ? (
                                  <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                                    {INTERVIEW_STAGE_OPTIONS.find((option) => option.value === application.interviewStage)?.label ?? application.interviewStage}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="mt-3 grid gap-3">
                                <select
                                  value={draftStages[application.id] ?? ''}
                                  onChange={(event) =>
                                    setDraftStages((current) => ({
                                      ...current,
                                      [application.id]: event.target.value as JobInterviewStage | '',
                                    }))
                                  }
                                  className="h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
                                >
                                  <option value="">No interview stage yet</option>
                                  {INTERVIEW_STAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <Textarea
                                  value={draftNotes[application.id] ?? ''}
                                  onChange={(event) =>
                                    setDraftNotes((current) => ({
                                      ...current,
                                      [application.id]: event.target.value,
                                    }))
                                  }
                                  rows={4}
                                  placeholder="Private recruiter notes, interview signals, or follow-up context."
                                />
                              </div>
                            </div>
                            {application.selectedProof ? (
                              <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Attached proof</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{application.selectedProof.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{application.selectedProof.score}/10 score • {application.selectedProof.verificationConfidence}% trust</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="min-w-[280px] space-y-3">
                            <Button className="w-full" variant={application.status === 'reviewing' ? 'default' : 'outline'} onClick={() => updateApplicationStatus(application.id, 'reviewing')} disabled={updatingApplicationId === application.id}>
                              Mark reviewing
                            </Button>
                            <Button className="w-full" variant={application.status === 'shortlisted' ? 'default' : 'outline'} onClick={() => updateApplicationStatus(application.id, 'shortlisted')} disabled={updatingApplicationId === application.id}>
                              Shortlist
                            </Button>
                            <Button className="w-full" variant={application.status === 'rejected' ? 'default' : 'outline'} onClick={() => updateApplicationStatus(application.id, 'rejected')} disabled={updatingApplicationId === application.id}>
                              Reject
                            </Button>
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() =>
                                updateApplicationStatus(application.id, application.status, {
                                  recruiterNotes: draftNotes[application.id] ?? '',
                                  interviewStage: draftStages[application.id] ?? '',
                                })
                              }
                              disabled={updatingApplicationId === application.id}
                            >
                              Save pipeline notes
                            </Button>
                            <div className="flex gap-2">
                              <Button asChild variant="outline" className="flex-1">
                                <Link href={`/profile/${encodeURIComponent(application.applicant.username)}`}>View profile</Link>
                              </Button>
                              {application.selectedProof ? (
                                <Button asChild variant="outline" className="flex-1">
                                  <Link href={`/proof/${application.selectedProof.id}`}>Review proof</Link>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

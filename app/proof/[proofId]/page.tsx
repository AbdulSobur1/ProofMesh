'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  Hash,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { ProofDetailResponse, type PeerVerificationRelationship } from '@/lib/types'
import { PROFESSION_LABELS, PROOF_TYPE_LABELS, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'
import { getVerificationMeta } from '@/lib/services/verification'
import { useProofs } from '@/lib/proof-context'

interface ProofDetailPageProps {
  params: {
    proofId: string
  }
}

const RELATIONSHIP_OPTIONS: Array<{ value: PeerVerificationRelationship; label: string }> = [
  { value: 'peer', label: 'Peer' },
  { value: 'client', label: 'Client' },
  { value: 'manager', label: 'Manager' },
  { value: 'collaborator', label: 'Collaborator' },
]

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export default function ProofDetailPage({ params }: ProofDetailPageProps) {
  const { currentUser } = useProofs()
  const [data, setData] = useState<ProofDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [reportReason, setReportReason] = useState<'spam' | 'abuse' | 'fraud' | 'misleading' | 'copyright' | 'other'>('fraud')
  const [reportDetails, setReportDetails] = useState('')
  const [form, setForm] = useState({
    verifierName: '',
    verifierRole: '',
    verifierCompany: '',
    relationship: 'peer' as PeerVerificationRelationship,
    message: '',
  })

  useEffect(() => {
    if (currentUser?.username && !form.verifierName) {
      setForm((prev) => ({ ...prev, verifierName: currentUser.username }))
    }
  }, [currentUser?.username, form.verifierName])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/proofs/${encodeURIComponent(params.proofId)}`, { cache: 'no-store' })
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
  }, [params.proofId])

  useEffect(() => {
    load()
  }, [load])

  const proof = data?.proof
  const professionLabel = proof ? PROFESSION_LABELS[proof.profession as ProofProfession] ?? proof.profession : ''
  const proofTypeLabel = proof ? PROOF_TYPE_LABELS[proof.proofType as ProofType] ?? proof.proofType : ''
  const verificationMeta = proof ? getVerificationMeta(proof.verificationStatus) : null
  const moderationLabel = proof?.moderationStatus === 'removed' ? 'Removed' : proof?.moderationStatus === 'under_review' ? 'Under review' : null

  const relationshipLabel = useMemo(
    () => Object.fromEntries(RELATIONSHIP_OPTIONS.map((option) => [option.value, option.label])) as Record<PeerVerificationRelationship, string>,
    []
  )

  const handleSubmitVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch(`/api/proofs/${encodeURIComponent(params.proofId)}/endorsements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to submit verification note')
      }

      setForm((prev) => ({
        ...prev,
        verifierRole: '',
        verifierCompany: '',
        relationship: 'peer',
        message: '',
      }))

      await load()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to submit verification note')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReport = async () => {
    if (!proof) return

    setIsReporting(true)
    setFormError(null)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType: 'proof',
          targetId: proof.id,
          reason: reportReason,
          details: reportDetails,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to submit report')
      }

      setReportDetails('')
      await load()
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Failed to submit report')
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-[0.05] pointer-events-none" />
      <div className="absolute -top-28 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="px-4 py-8 md:px-8">
          <Button asChild variant="outline" size="sm" className="mb-6 border-white/10 bg-white/[0.04]">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>

          {error ? (
            <Card className="border border-white/10 bg-white/[0.04] p-8">
              <h1 className="mb-2 text-2xl font-semibold text-foreground">Proof unavailable</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </Card>
          ) : isLoading || !proof || !data?.user || !data?.reputation ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
              <Card className="border border-white/10 bg-white/[0.04] p-6">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-6 h-24 w-full" />
              </Card>
              <Skeleton className="h-[420px] w-full rounded-[24px]" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.95fr)]">
              <div className="space-y-6">
                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_18px_60px_rgba(2,6,23,0.24)] backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <Sparkles className="size-4 text-primary" />
                      Verified Proof
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className={`border ${verificationMeta?.tone ?? 'border-white/10 bg-white/5 text-foreground'}`}>
                        <ShieldCheck className="mr-1 size-3.5" />
                        {verificationMeta?.label ?? 'Trust signal'}
                      </Badge>
                      {moderationLabel ? (
                        <Badge variant="secondary" className="border border-amber-500/20 bg-amber-500/10 text-amber-300">
                          {moderationLabel}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                        Score {proof.score}/10
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="border border-white/10 bg-white/[0.04] text-foreground">
                      {professionLabel}
                    </Badge>
                    <Badge variant="secondary" className="border border-white/10 bg-white/[0.04] text-foreground">
                      {proofTypeLabel}
                    </Badge>
                    <Badge variant="secondary" className="border border-white/10 bg-white/[0.04] text-foreground">
                      {proof.verificationConfidence}% confidence
                    </Badge>
                    <Badge variant="secondary" className="border border-white/10 bg-white/[0.04] text-foreground">
                      {proof.endorsementCount} verification note{proof.endorsementCount === 1 ? '' : 's'}
                    </Badge>
                  </div>

                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">{proof.title}</h1>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{proof.description}</p>

                  {proof.outcomeSummary ? (
                    <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Outcome Summary
                      </div>
                      <p className="text-sm leading-7 text-foreground/85">{proof.outcomeSummary}</p>
                    </div>
                  ) : null}

                  {proof.verificationSignals.length > 0 ? (
                    <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          <CheckCircle2 className="size-4 text-primary" />
                          Trust Signals
                        </div>
                        {proof.verifiedAt ? (
                          <span className="text-xs text-muted-foreground">Verified {formatDate(proof.verifiedAt)}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {proof.verificationSignals.map((signal) => (
                          <Badge key={`${proof.id}-${signal.label}`} variant="secondary" className="border border-white/10 bg-white/5 text-foreground">
                            {signal.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-2">
                    {proof.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="border border-white/10 bg-white/5 text-foreground">
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

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
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
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Trust Avg</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{data.reputation.averageConfidence}%</p>
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

                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Peer Verification</p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">External trust notes</h2>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04]">
                      {proof.endorsementCount} total
                    </Badge>
                  </div>

                  {proof.endorsements.length === 0 ? (
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      No peer or client verification notes yet. Add one below to strengthen the trust around this proof.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {proof.endorsements.map((endorsement) => (
                        <div key={endorsement.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{endorsement.verifierName}</p>
                                <Badge variant="secondary" className="border border-white/10 bg-white/5 text-foreground">
                                  {relationshipLabel[endorsement.relationship]}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[endorsement.verifierRole, endorsement.verifierCompany].filter(Boolean).join(' • ') || 'Independent verifier'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(endorsement.createdAt)}</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-foreground/85">{endorsement.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    <Flag className="size-4 text-primary" />
                    Report Proof
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Flag spam, fraud, abuse, or misleading work so it can be reviewed by moderation.
                  </p>
                  <div className="mt-5 space-y-4">
                    <select
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value as typeof reportReason)}
                      className="flex h-11 w-full rounded-xl border border-input bg-card/70 px-4 py-2 text-sm text-foreground outline-none"
                    >
                      <option value="fraud">Fraud</option>
                      <option value="misleading">Misleading</option>
                      <option value="spam">Spam</option>
                      <option value="abuse">Abuse</option>
                      <option value="copyright">Copyright</option>
                      <option value="other">Other</option>
                    </select>
                    <Textarea
                      value={reportDetails}
                      onChange={(event) => setReportDetails(event.target.value)}
                      rows={4}
                      placeholder="Add any context that would help a moderator review this proof."
                    />
                    <Button onClick={handleReport} disabled={isReporting} className="w-full">
                      {isReporting ? 'Submitting report...' : 'Report proof'}
                    </Button>
                  </div>
                </Card>
              </div>

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
                        <p className="mt-1 break-all font-mono text-xs leading-6 text-foreground/80">{proof.txHash ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Verified Owner</p>
                        <p className="mt-1 text-sm text-foreground">{data.user.username}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Verification Status</p>
                        <p className="mt-1 text-sm text-foreground">{verificationMeta?.label ?? 'Trust signal pending'}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    <MessageSquareQuote className="size-4 text-primary" />
                    Add Verification Note
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-foreground">Ask a peer, client, or manager to back this proof</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    These notes are attached directly to the proof and strengthen the trust signal for anyone reviewing the work.
                  </p>

                  <form className="mt-5 space-y-4" onSubmit={handleSubmitVerification}>
                    {formError ? (
                      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formError}
                      </div>
                    ) : null}

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Verifier name</label>
                      <Input
                        value={form.verifierName}
                        onChange={(event) => setForm((prev) => ({ ...prev, verifierName: event.target.value }))}
                        placeholder="Jane Doe"
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Relationship</label>
                        <select
                          value={form.relationship}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              relationship: event.target.value as PeerVerificationRelationship,
                            }))
                          }
                          className="flex h-11 w-full rounded-xl border border-input bg-card/70 px-4 py-2 text-sm text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {RELATIONSHIP_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
                        <Input
                          value={form.verifierRole}
                          onChange={(event) => setForm((prev) => ({ ...prev, verifierRole: event.target.value }))}
                          placeholder="Marketing Lead"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Company or organization</label>
                      <Input
                        value={form.verifierCompany}
                        onChange={(event) => setForm((prev) => ({ ...prev, verifierCompany: event.target.value }))}
                        placeholder="Acme Inc."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Verification note</label>
                      <Textarea
                        value={form.message}
                        onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                        placeholder="Describe how you worked with this person and why this proof is credible."
                        rows={5}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting verification...' : 'Submit verification note'}
                    </Button>
                  </form>
                </Card>

                <Card className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Reputation Signal</p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">Owner Summary</h2>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.04]">
                      {data.reputation.endorsementCount} external notes
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    This proof contributes to the owner’s public reputation score, trust confidence, and verification history, making the record easier to trust across the profile surface.
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

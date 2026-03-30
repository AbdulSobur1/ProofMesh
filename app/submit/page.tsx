"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProofs } from '@/lib/proof-context'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, CheckCircle2, Lightbulb, ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  PROFESSION_GUIDANCE,
  PROFESSION_LABELS,
  PROOF_PROFESSIONS,
  PROOF_TYPE_LABELS,
  PROOF_TYPES,
  type ProofProfession,
  type ProofType,
} from '@/lib/proof-taxonomy'
import { type ProofEvidenceItem, type ProofSourceCategory } from '@/lib/types'

const EVIDENCE_TYPE_OPTIONS: Array<{ value: ProofEvidenceItem['type']; label: string }> = [
  { value: 'repository', label: 'Repository' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'case_study', label: 'Case study' },
  { value: 'document', label: 'Document' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'video', label: 'Video' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'other', label: 'Other' },
]

const SOURCE_CATEGORY_OPTIONS: Array<{ value: ProofSourceCategory; label: string }> = [
  { value: 'general', label: 'General work sample' },
  { value: 'github', label: 'GitHub / code project' },
  { value: 'portfolio', label: 'Portfolio piece' },
  { value: 'case_study', label: 'Case study' },
  { value: 'document', label: 'Document / artifact' },
  { value: 'presentation', label: 'Presentation / deck' },
]

export default function SubmitProof() {
  const router = useRouter()
  const { addProof, currentUser } = useProofs()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    profession: 'software_engineering' as ProofProfession,
    proofType: 'project' as ProofType,
    sourceCategory: 'general' as ProofSourceCategory,
    title: '',
    description: '',
    outcomeSummary: '',
    artifactSummary: '',
    link: '',
  })
  const [evidenceItems, setEvidenceItems] = useState<Array<{ label: string; url: string; type: ProofEvidenceItem['type'] }>>([
    { label: '', url: '', type: 'repository' },
  ])

  const guidance = PROFESSION_GUIDANCE[formData.profession]

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      router.push('/login')
      return
    }
    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await addProof({
        title: formData.title,
        description: formData.description,
        link: formData.link || undefined,
        sourceCategory: formData.sourceCategory,
        artifactSummary: formData.artifactSummary || undefined,
        evidenceItems: evidenceItems
          .filter((item) => item.label.trim() && item.url.trim())
          .map((item) => ({
            label: item.label.trim(),
            url: item.url.trim(),
            type: item.type,
          })),
        profession: formData.profession,
        proofType: formData.proofType,
        outcomeSummary: formData.outcomeSummary || undefined,
      })
      setSuccess(true)
      setFormData({
        profession: 'software_engineering',
        proofType: 'project',
        sourceCategory: 'general',
        title: '',
        description: '',
        outcomeSummary: '',
        artifactSummary: '',
        link: '',
      })
      setEvidenceItems([{ label: '', url: '', type: 'repository' }])

      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  Profession-aware AI evaluation
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Submit work that proves what you can actually do.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  ProofMesh now evaluates technical, analytical, creative, and operational work with more context, so your profile reflects real capability instead of generic claims.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              {success ? (
                <Card className="rounded-[2rem] border-2 border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="size-8 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-foreground">Proof submitted</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Your submission is being evaluated now. Redirecting to dashboard...
                  </p>
                </Card>
              ) : (
                <Card className="rounded-[2rem] border border-border/60 p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Profession</label>
                        <select
                          name="profession"
                          value={formData.profession}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="h-11 w-full rounded-xl border border-input bg-card/70 px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {PROOF_PROFESSIONS.map((profession) => (
                            <option key={profession} value={profession}>
                              {PROFESSION_LABELS[profession]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Proof type</label>
                        <select
                          name="proofType"
                          value={formData.proofType}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="h-11 w-full rounded-xl border border-input bg-card/70 px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {PROOF_TYPES.map((proofType) => (
                            <option key={proofType} value={proofType}>
                              {PROOF_TYPE_LABELS[proofType]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">Primary source type</label>
                      <select
                        name="sourceCategory"
                        value={formData.sourceCategory}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="h-11 w-full rounded-xl border border-input bg-card/70 px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {SOURCE_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Proof title <span className="text-primary">*</span>
                      </label>
                      <Input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder={guidance.titlePlaceholder}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Description <span className="text-primary">*</span>
                      </label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder={guidance.descriptionPlaceholder}
                        rows={7}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Outcome summary <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Textarea
                        name="outcomeSummary"
                        value={formData.outcomeSummary}
                        onChange={handleChange}
                        placeholder={guidance.outcomePlaceholder}
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Proof link <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Input
                        type="url"
                        name="link"
                        value={formData.link}
                        onChange={handleChange}
                        placeholder="https://example.com/case-study-or-work-sample"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Evidence summary <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Textarea
                        name="artifactSummary"
                        value={formData.artifactSummary}
                        onChange={handleChange}
                        placeholder="Summarize the repo, deck, doc set, deliverables, or other artifacts attached below."
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground">Supporting evidence links</label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Add GitHub repos, portfolio entries, case studies, docs, decks, videos, or other evidence.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEvidenceItems((current) => [...current, { label: '', url: '', type: 'other' }])
                          }
                          disabled={isLoading || evidenceItems.length >= 6}
                        >
                          <Plus className="size-4" />
                          Add link
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {evidenceItems.map((item, index) => (
                          <div key={`evidence-${index}`} className="grid gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 md:grid-cols-[1fr_1.4fr_160px_auto]">
                            <Input
                              value={item.label}
                              onChange={(event) =>
                                setEvidenceItems((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, label: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="GitHub repo"
                              disabled={isLoading}
                            />
                            <Input
                              type="url"
                              value={item.url}
                              onChange={(event) =>
                                setEvidenceItems((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, url: event.target.value } : entry
                                  )
                                )
                              }
                              placeholder="https://github.com/..."
                              disabled={isLoading}
                            />
                            <select
                              value={item.type}
                              onChange={(event) =>
                                setEvidenceItems((current) =>
                                  current.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, type: event.target.value as ProofEvidenceItem['type'] } : entry
                                  )
                                )
                              }
                              disabled={isLoading}
                              className="h-11 w-full rounded-xl border border-input bg-card/70 px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              {EVIDENCE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEvidenceItems((current) =>
                                  current.length === 1 ? [{ label: '', url: '', type: 'repository' }] : current.filter((_, entryIndex) => entryIndex !== index)
                                )
                              }
                              disabled={isLoading}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" disabled={isLoading} size="lg" className="flex-1 gap-2 rounded-2xl">
                        {isLoading ? (
                          <>
                            <Spinner className="size-4" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Upload className="size-4" />
                            Submit proof
                          </>
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={isLoading} className="rounded-2xl">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2rem] border border-border/60 p-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Tips for {PROFESSION_LABELS[formData.profession]}</h3>
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  {guidance.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </Card>

              <Card className="rounded-[2rem] border border-border/60 bg-background/60 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">During analysis</p>
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-14" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

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
import { Upload, CheckCircle2, Lightbulb, ArrowLeft, Sparkles } from 'lucide-react'
import {
  PROFESSION_GUIDANCE,
  PROFESSION_LABELS,
  PROOF_PROFESSIONS,
  PROOF_TYPE_LABELS,
  PROOF_TYPES,
  type ProofProfession,
  type ProofType,
} from '@/lib/proof-taxonomy'

export default function SubmitProof() {
  const router = useRouter()
  const { addProof, currentUser } = useProofs()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    profession: 'software_engineering' as ProofProfession,
    proofType: 'project' as ProofType,
    title: '',
    description: '',
    outcomeSummary: '',
    link: '',
  })

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
        profession: formData.profession,
        proofType: formData.proofType,
        outcomeSummary: formData.outcomeSummary || undefined,
      })
      setSuccess(true)
      setFormData({
        profession: 'software_engineering',
        proofType: 'project',
        title: '',
        description: '',
        outcomeSummary: '',
        link: '',
      })

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

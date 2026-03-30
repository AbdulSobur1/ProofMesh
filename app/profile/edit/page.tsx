'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, UserRound } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useProofs } from '@/lib/proof-context'
import { ProfessionalProfile, UpdateProfileInput } from '@/lib/types'

const emptyForm: UpdateProfileInput = {
  displayName: '',
  headline: '',
  bio: '',
  location: '',
  websiteUrl: '',
  avatarUrl: '',
  currentRole: '',
  currentCompany: '',
  yearsExperience: '',
}

export default function EditProfilePage() {
  const router = useRouter()
  const { currentUser, refresh } = useProofs()
  const [form, setForm] = useState<UpdateProfileInput>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/profile/me', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load your profile')
        }

        const payload = (await response.json()) as { user: ProfessionalProfile }
        setForm({
          displayName: payload.user.displayName ?? '',
          headline: payload.user.headline ?? '',
          bio: payload.user.bio ?? '',
          location: payload.user.location ?? '',
          websiteUrl: payload.user.websiteUrl ?? '',
          avatarUrl: payload.user.avatarUrl ?? '',
          currentRole: payload.user.currentRole ?? '',
          currentCompany: payload.user.currentCompany ?? '',
          yearsExperience: payload.user.yearsExperience?.toString() ?? '',
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const updateField = (field: keyof UpdateProfileInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save profile')
      }

      await refresh()
      setSuccess('Profile updated successfully.')

      if (currentUser?.username) {
        router.push(`/profile/${encodeURIComponent(currentUser.username)}`)
        router.refresh()
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-72">
        <TopBar />

        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <div className="mb-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={currentUser ? `/profile/${encodeURIComponent(currentUser.username)}` : '/dashboard'}>
                <ArrowLeft className="size-4" />
                Back to profile
              </Link>
            </Button>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Professional identity</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Build a profile that feels credible before anyone opens your proofs.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Add the core profile details LinkedIn users expect, then let ProofMesh’s verified work and trust signals make those claims believable.
                </p>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="rounded-[2rem] border border-border/60 p-6 md:p-8">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {error ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                      {success}
                    </div>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Display name</label>
                      <Input value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} placeholder="Grace Adebayo" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Location</label>
                      <Input value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="Lagos, Nigeria" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Headline</label>
                    <Input value={form.headline} onChange={(event) => updateField('headline', event.target.value)} placeholder="Product marketer focused on launches, positioning, and revenue impact." />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Current role</label>
                      <Input value={form.currentRole} onChange={(event) => updateField('currentRole', event.target.value)} placeholder="Senior Product Marketer" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Current company</label>
                      <Input value={form.currentCompany} onChange={(event) => updateField('currentCompany', event.target.value)} placeholder="ProofMesh" />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Website</label>
                      <Input value={form.websiteUrl} onChange={(event) => updateField('websiteUrl', event.target.value)} placeholder="https://your-site.com" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Avatar URL</label>
                      <Input value={form.avatarUrl} onChange={(event) => updateField('avatarUrl', event.target.value)} placeholder="https://images.example.com/avatar.jpg" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Years of experience</label>
                    <Input value={form.yearsExperience} onChange={(event) => updateField('yearsExperience', event.target.value.replace(/[^\d]/g, '').slice(0, 2))} placeholder="5" />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Bio</label>
                    <Textarea
                      value={form.bio}
                      onChange={(event) => updateField('bio', event.target.value)}
                      rows={6}
                      placeholder="Summarize the kind of work you do, the problems you solve, and the evidence people should expect to see in your proof history."
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                    <Save className="size-4" />
                    {isSaving ? 'Saving profile...' : 'Save profile'}
                  </Button>
                </form>
              )}
            </Card>

            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">What this unlocks</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                <p>A stronger first impression before recruiters inspect proof details.</p>
                <p>Better context for why your proofs matter and how they connect to your career story.</p>
                <p>A foundation for future features like company pages, networking, messaging, and applications.</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

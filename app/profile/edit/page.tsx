'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useProofs } from '@/lib/proof-context'
import {
  ClaimedSkill,
  CertificationEntry,
  EditCertificationInput,
  EditClaimedSkillInput,
  EditEducationInput,
  EditWorkExperienceInput,
  EducationEntry,
  ProfessionalProfile,
  UpdateProfileInput,
  WorkExperience,
} from '@/lib/types'

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
  walletAddress: '',
  workExperiences: [],
  educations: [],
  certifications: [],
  claimedSkills: [],
}

const createExperience = (): EditWorkExperienceInput => ({
  id: crypto.randomUUID(),
  title: '',
  company: '',
  location: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
})

const createEducation = (): EditEducationInput => ({
  id: crypto.randomUUID(),
  school: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  description: '',
})

const createCertification = (): EditCertificationInput => ({
  id: crypto.randomUUID(),
  name: '',
  issuer: '',
  issueDate: '',
  credentialUrl: '',
})

const createClaimedSkill = (): EditClaimedSkillInput => ({
  id: crypto.randomUUID(),
  name: '',
})

export default function EditProfilePage() {
  const router = useRouter()
  const { currentUser, refresh } = useProofs()
  const [form, setForm] = useState<UpdateProfileInput>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const updateExperience = (id: string, field: keyof EditWorkExperienceInput, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      workExperiences: current.workExperiences.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]: value,
              ...(field === 'isCurrent' && value === true ? { endDate: '' } : {}),
            }
          : entry
      ),
    }))
  }

  const updateEducation = (id: string, field: keyof EditEducationInput, value: string) => {
    setForm((current) => ({
      ...current,
      educations: current.educations.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }))
  }

  const updateCertification = (id: string, field: keyof EditCertificationInput, value: string) => {
    setForm((current) => ({
      ...current,
      certifications: current.certifications.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }))
  }

  const updateClaimedSkill = (id: string, value: string) => {
    setForm((current) => ({
      ...current,
      claimedSkills: current.claimedSkills.map((entry) =>
        entry.id === id ? { ...entry, name: value } : entry
      ),
    }))
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/profile/me', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load your profile')
        }

        const payload = (await response.json()) as {
          user: ProfessionalProfile
          workExperiences: WorkExperience[]
          educations: EducationEntry[]
          certifications: CertificationEntry[]
          claimedSkills: ClaimedSkill[]
        }
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
          walletAddress: payload.user.walletAddress ?? '',
          workExperiences: payload.workExperiences.map((entry) => ({
            id: entry.id,
            title: entry.title,
            company: entry.company,
            location: entry.location ?? '',
            startDate: entry.startDate,
            endDate: entry.endDate ?? '',
            isCurrent: entry.isCurrent,
            description: entry.description ?? '',
          })),
          educations: payload.educations.map((entry) => ({
            id: entry.id,
            school: entry.school,
            degree: entry.degree,
            fieldOfStudy: entry.fieldOfStudy ?? '',
            startDate: entry.startDate ?? '',
            endDate: entry.endDate ?? '',
            description: entry.description ?? '',
          })),
          certifications: payload.certifications.map((entry) => ({
            id: entry.id,
            name: entry.name,
            issuer: entry.issuer,
            issueDate: entry.issueDate ?? '',
            credentialUrl: entry.credentialUrl ?? '',
          })),
          claimedSkills: payload.claimedSkills.map((entry) => ({
            id: entry.id,
            name: entry.name,
          })),
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
      <main className="flex-1 pb-24 md:ml-72 md:pb-0">
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
                    <label className="mb-2 block text-sm font-medium text-foreground">Wallet address</label>
                    <Input value={form.walletAddress} onChange={(event) => updateField('walletAddress', event.target.value.trim())} placeholder="0x1234...abcd" />
                    <p className="mt-2 text-xs text-muted-foreground">Optional. This becomes a public credibility signal on your profile and exports.</p>
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

                  <div className="space-y-4 rounded-[1.5rem] border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Work experience</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Add the roles that explain your career path behind the proof.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, workExperiences: [...current.workExperiences, createExperience()] }))}>
                        <Plus className="size-4" />
                        Add role
                      </Button>
                    </div>

                    {form.workExperiences.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No roles added yet.</p>
                    ) : (
                      form.workExperiences.map((entry) => (
                        <div key={entry.id} className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, workExperiences: current.workExperiences.filter((item) => item.id !== entry.id) }))}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input value={entry.title} onChange={(event) => updateExperience(entry.id, 'title', event.target.value)} placeholder="Senior Product Designer" />
                            <Input value={entry.company} onChange={(event) => updateExperience(entry.id, 'company', event.target.value)} placeholder="ProofMesh" />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input value={entry.location} onChange={(event) => updateExperience(entry.id, 'location', event.target.value)} placeholder="Remote" />
                            <Input value={entry.startDate} onChange={(event) => updateExperience(entry.id, 'startDate', event.target.value)} placeholder="Jan 2023" />
                            <Input value={entry.endDate} onChange={(event) => updateExperience(entry.id, 'endDate', event.target.value)} placeholder={entry.isCurrent ? 'Current role' : 'Mar 2025'} disabled={entry.isCurrent} />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input type="checkbox" checked={entry.isCurrent} onChange={(event) => updateExperience(entry.id, 'isCurrent', event.target.checked)} />
                            I currently work here
                          </label>
                          <Textarea value={entry.description} onChange={(event) => updateExperience(entry.id, 'description', event.target.value)} rows={4} placeholder="Describe the scope, outcomes, and the kind of work this role is evidence for." />
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Education</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Add formal education that supports your professional story.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, educations: [...current.educations, createEducation()] }))}>
                        <Plus className="size-4" />
                        Add education
                      </Button>
                    </div>
                    {form.educations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No education entries added yet.</p>
                    ) : (
                      form.educations.map((entry) => (
                        <div key={entry.id} className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, educations: current.educations.filter((item) => item.id !== entry.id) }))}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input value={entry.school} onChange={(event) => updateEducation(entry.id, 'school', event.target.value)} placeholder="University of Lagos" />
                            <Input value={entry.degree} onChange={(event) => updateEducation(entry.id, 'degree', event.target.value)} placeholder="B.Sc. Computer Science" />
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input value={entry.fieldOfStudy} onChange={(event) => updateEducation(entry.id, 'fieldOfStudy', event.target.value)} placeholder="Human-Computer Interaction" />
                            <Input value={entry.startDate} onChange={(event) => updateEducation(entry.id, 'startDate', event.target.value)} placeholder="2018" />
                            <Input value={entry.endDate} onChange={(event) => updateEducation(entry.id, 'endDate', event.target.value)} placeholder="2022" />
                          </div>
                          <Textarea value={entry.description} onChange={(event) => updateEducation(entry.id, 'description', event.target.value)} rows={3} placeholder="Anything notable: specialization, distinction, thesis, society leadership, or relevant coursework." />
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Certifications</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Add certifications that support your claims and specializations.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, certifications: [...current.certifications, createCertification()] }))}>
                        <Plus className="size-4" />
                        Add certification
                      </Button>
                    </div>
                    {form.certifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No certifications added yet.</p>
                    ) : (
                      form.certifications.map((entry) => (
                        <div key={entry.id} className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, certifications: current.certifications.filter((item) => item.id !== entry.id) }))}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input value={entry.name} onChange={(event) => updateCertification(entry.id, 'name', event.target.value)} placeholder="Google UX Design Certificate" />
                            <Input value={entry.issuer} onChange={(event) => updateCertification(entry.id, 'issuer', event.target.value)} placeholder="Google" />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input value={entry.issueDate} onChange={(event) => updateCertification(entry.id, 'issueDate', event.target.value)} placeholder="Jun 2024" />
                            <Input value={entry.credentialUrl} onChange={(event) => updateCertification(entry.id, 'credentialUrl', event.target.value)} placeholder="https://credential.example.com" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-border/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Claimed skills</h2>
                        <p className="mt-1 text-sm text-muted-foreground">List the skills you want ProofMesh to compare against your actual proof history.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, claimedSkills: [...current.claimedSkills, createClaimedSkill()] }))}>
                        <Plus className="size-4" />
                        Add skill
                      </Button>
                    </div>
                    {form.claimedSkills.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No claimed skills added yet.</p>
                    ) : (
                      form.claimedSkills.map((entry) => (
                        <div key={entry.id} className="flex gap-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                          <Input value={entry.name} onChange={(event) => updateClaimedSkill(entry.id, event.target.value)} placeholder="product strategy" />
                          <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, claimedSkills: current.claimedSkills.filter((item) => item.id !== entry.id) }))}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))
                    )}
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

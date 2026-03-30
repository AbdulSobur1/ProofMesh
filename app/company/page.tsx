'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Save } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyProfile } from '@/lib/types'

type CompanyForm = {
  name: string
  slug: string
  tagline: string
  description: string
  websiteUrl: string
  location: string
  logoUrl: string
  industry: string
}

const emptyForm: CompanyForm = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  websiteUrl: '',
  location: '',
  logoUrl: '',
  industry: '',
}

export default function CompanyPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [form, setForm] = useState<CompanyForm>(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/companies', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load company')
        }
        const payload = (await response.json()) as { company: CompanyProfile | null }
        setCompany(payload.company)
        if (payload.company) {
          setForm({
            name: payload.company.name,
            slug: payload.company.slug,
            tagline: payload.company.tagline ?? '',
            description: payload.company.description ?? '',
            websiteUrl: payload.company.websiteUrl ?? '',
            location: payload.company.location ?? '',
            logoUrl: payload.company.logoUrl ?? '',
            industry: payload.company.industry ?? '',
          })
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const save = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(company ? `/api/companies/${encodeURIComponent(company.slug)}` : '/api/companies', {
        method: company ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save company')
      }
      setCompany(payload.company as CompanyProfile)
      setForm({
        name: payload.company.name,
        slug: payload.company.slug,
        tagline: payload.company.tagline ?? '',
        description: payload.company.description ?? '',
        websiteUrl: payload.company.websiteUrl ?? '',
        location: payload.company.location ?? '',
        logoUrl: payload.company.logoUrl ?? '',
        industry: payload.company.industry ?? '',
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save company')
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
          <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.08)] backdrop-blur md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(54,214,255,0.05),transparent_28%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Employer identity</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Build a company presence for your hiring workflow.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Add the company brand, story, and context that candidates should see when they evaluate your jobs.
                </p>
              </div>
            </div>
          </section>

          {error ? (
            <Card className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="rounded-[2rem] border border-border/60 p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Company name" />
                  <Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="company-slug" disabled={Boolean(company)} />
                  <Input value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="Short employer tagline" />
                  <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={6} placeholder="Describe what the company does, what it values, and what candidates can expect." />
                  <Input value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://company.com" />
                  <Input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="London, UK" />
                  <Input value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="https://images.example.com/logo.png" />
                  <Input value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} placeholder="Fintech" />

                  <div className="flex justify-end">
                    <Button onClick={save} disabled={isSaving}>
                      <Save className="size-4" />
                      {isSaving ? 'Saving...' : company ? 'Update company' : 'Create company'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card className="rounded-[2rem] border border-border/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Company page</p>
              {company ? (
                <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>Your company page is live and can be attached to jobs automatically.</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/company/${encodeURIComponent(company.slug)}`}>Open company page</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Create a company once and future jobs will carry employer identity instead of looking anonymous.
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

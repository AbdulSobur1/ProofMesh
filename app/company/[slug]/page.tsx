'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Building2, Globe, MapPin } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
        setData((await response.json()) as CompanyResponse)
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
                    {company.description ? (
                      <p className="mt-6 max-w-3xl text-sm leading-7 text-foreground/85">{company.description}</p>
                    ) : null}
                  </div>
                </div>
              </section>

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

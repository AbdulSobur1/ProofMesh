import Link from 'next/link'
import { ArrowRight, BadgeCheck, Fingerprint, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const steps = [
  {
    title: 'Submit proof',
    body: 'Projects, links, and write-ups become verifiable records.',
  },
  {
    title: 'AI evaluates',
    body: 'Every submission gets concise scoring, feedback, and tags.',
  },
  {
    title: 'Build reputation',
    body: 'Your public profile becomes the source of truth for skill.',
  },
]

const features = [
  {
    title: 'Trusted by evidence',
    body: 'ProofMesh turns work into a cleaner signal than resumes or hype.',
  },
  {
    title: 'Private by default',
    body: 'Only the details you choose are surfaced in your public profile.',
  },
  {
    title: 'Designed to scale',
    body: 'A lean dashboard, clear profile pages, and an auth flow that feels current.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,140,255,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(54,214,255,0.06),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Fingerprint className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">ProofMesh</div>
                <div className="text-xs text-muted-foreground">Proof, reputation, and identity</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </header>

          <div className="grid gap-10 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-6 border-primary/20 bg-primary/5 text-primary">
                Skill verification for serious builders
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Verify skill with proof, not profile noise.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                ProofMesh helps builders submit work, verify it with AI, and publish a reputation profile that feels calm, credible, and easy to scan.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild className="gap-2">
                  <Link href="/signup">
                    Create account
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { value: 'AI', label: 'evaluation' },
                  { value: '24/7', label: 'verifiable profiles' },
                  { value: 'JWT', label: 'auth sessions' },
                ].map((item) => (
                  <Card key={item.label} className="rounded-2xl border-border/60 p-4">
                    <div className="text-lg font-semibold">{item.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="relative rounded-[2rem] border-border/60 bg-card/80 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.18)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Product preview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">A cleaner reputation layer</h2>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Active
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reputation</span>
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="mt-3 text-4xl font-semibold text-gradient">8.7</div>
                  <div className="mt-3 h-2 rounded-full bg-muted/70">
                    <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-primary to-accent" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BadgeCheck className="size-4 text-primary" />
                      Verified proof
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Score, feedback, tags, and timestamp all together.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="size-4 text-primary" />
                      AI analysis
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      A compact review card that feels like a real product feature.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="rounded-2xl border-border/60 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Step {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="rounded-2xl border-border/60 p-6">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}

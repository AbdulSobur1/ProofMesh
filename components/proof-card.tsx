import Link from 'next/link'
import { Calendar, ExternalLink, Hash, Sparkles } from 'lucide-react'
import { Proof } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ProofCardProps {
  proof: Proof
}

export function ProofCard({ proof }: ProofCardProps) {
  const getScoreStyles = (score: number) => {
    if (score >= 9) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
    if (score >= 8) return 'border-blue-500/20 bg-blue-500/10 text-blue-500'
    if (score >= 7) return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500'
    return 'border-amber-500/20 bg-amber-500/10 text-amber-500'
  }

  const proofDate = new Date(proof.createdAt)
  const formattedDate = proofDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const relativeTime = (() => {
    const now = new Date()
    const diff = now.getTime() - proofDate.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  })()

  return (
    <Card className="group rounded-[2rem] border border-border/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(2,8,23,0.08)]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              AI reviewed
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
              {proof.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {proof.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {proof.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full border border-border/60 bg-background/70 text-foreground">
                {tag}
              </Badge>
            ))}
          </div>

          {proof.feedback ? (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">AI feedback</p>
              <p className="mt-2 text-sm leading-6 text-foreground/80">{proof.feedback}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5" />
              <span>
                {relativeTime} • {formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="size-3.5" />
              <span className="font-mono tracking-tight">{proof.txHash.slice(0, 12)}…</span>
            </div>
            {proof.link ? (
              <Link
                href={proof.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
              >
                Open proof
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className={`flex-shrink-0 rounded-2xl border px-3 py-1.5 text-sm font-semibold ${getScoreStyles(proof.score)}`}>
          {proof.score}
        </div>
      </div>
    </Card>
  )
}

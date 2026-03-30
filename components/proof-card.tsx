import Link from 'next/link'
import { Calendar, ExternalLink, Files, Hash, MessageSquareQuote, ShieldCheck, Sparkles } from 'lucide-react'
import { Proof } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PROFESSION_LABELS, PROOF_TYPE_LABELS, type ProofProfession, type ProofType } from '@/lib/proof-taxonomy'
import { getVerificationMeta } from '@/lib/services/verification'

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

  const professionLabel = PROFESSION_LABELS[proof.profession as ProofProfession] ?? proof.profession
  const proofTypeLabel = PROOF_TYPE_LABELS[proof.proofType as ProofType] ?? proof.proofType
  const verificationMeta = getVerificationMeta(proof.verificationStatus)
  const moderationLabel = proof.moderationStatus === 'removed' ? 'Removed' : proof.moderationStatus === 'under_review' ? 'Under review' : null

  return (
    <Card className="group rounded-[2rem] border border-border/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(2,8,23,0.08)]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              AI reviewed
              <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/70 text-foreground normal-case tracking-normal">
                {professionLabel}
              </Badge>
              <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/70 text-foreground normal-case tracking-normal">
                {proofTypeLabel}
              </Badge>
              <Badge variant="secondary" className={`rounded-full border normal-case tracking-normal ${verificationMeta.tone}`}>
                <ShieldCheck className="mr-1 size-3.5" />
                {verificationMeta.label}
              </Badge>
              {moderationLabel ? (
                <Badge variant="secondary" className="rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 normal-case tracking-normal">
                  {moderationLabel}
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
              {proof.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {proof.description}
            </p>
          </div>

          {proof.outcomeSummary ? (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Outcome summary</p>
              <p className="mt-2 text-sm leading-6 text-foreground/80">{proof.outcomeSummary}</p>
            </div>
          ) : null}

          {proof.verificationSignals.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trust signals</p>
                <span className="text-xs font-medium text-primary">{proof.verificationConfidence}% confidence</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {proof.verificationSignals.map((signal) => (
                  <Badge
                    key={`${proof.id}-${signal.label}`}
                    variant="secondary"
                    className="rounded-full border border-border/60 bg-background/70 text-foreground"
                  >
                    {signal.label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

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
            {proof.endorsementCount > 0 ? (
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="size-3.5" />
                <span>{proof.endorsementCount} verification note{proof.endorsementCount === 1 ? '' : 's'}</span>
              </div>
            ) : null}
            {(proof.evidenceItems?.length ?? 0) > 0 ? (
              <div className="flex items-center gap-2">
                <Files className="size-3.5" />
                <span>{proof.evidenceItems?.length} supporting link{proof.evidenceItems?.length === 1 ? '' : 's'}</span>
              </div>
            ) : null}
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

'use client'

import { Bookmark, BookmarkCheck, Briefcase, CheckCircle2, MessageSquareQuote, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DiscoveryCandidate } from '@/lib/types'
import { PROFESSION_LABELS, type ProofProfession } from '@/lib/proof-taxonomy'

interface CandidateCardProps {
  candidate: DiscoveryCandidate
  onToggleSave: (candidate: DiscoveryCandidate) => Promise<void> | void
  isSaving?: boolean
}

export function CandidateCard({ candidate, onToggleSave, isSaving = false }: CandidateCardProps) {
  const professionLabel = candidate.primaryProfession
    ? PROFESSION_LABELS[candidate.primaryProfession as ProofProfession] ?? candidate.primaryProfession
    : 'Multi-disciplinary'

  return (
    <Card className="rounded-[2rem] border border-border/60 p-6 shadow-[0_20px_60px_rgba(2,8,23,0.06)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
              <Briefcase className="mr-1 size-3.5" />
              {professionLabel}
            </Badge>
            <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
              {candidate.reputation.averageConfidence}% trust
            </Badge>
            {candidate.isSaved ? (
              <Badge variant="secondary" className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <BookmarkCheck className="mr-1 size-3.5" />
                Saved
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{candidate.username}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {candidate.strongestProof
              ? `Strongest proof: ${candidate.strongestProof.title}`
              : 'No featured proof yet.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {candidate.topTags.length === 0 ? (
              <Badge variant="outline" className="border-border/60 bg-background/60 text-muted-foreground">
                No tags yet
              </Badge>
            ) : (
              candidate.topTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="border border-border/60 bg-background/70 text-foreground">
                  {tag}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="grid min-w-[250px] grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Score</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{candidate.reputation.averageScore.toFixed(1)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verified</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{candidate.reputation.verifiedProofs}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proofs</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{candidate.reputation.totalProofs}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Endorsements</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{candidate.reputation.endorsementCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <CheckCircle2 className="size-4 text-primary" />
          <span>{candidate.reputation.verifiedProofs} trusted proof{candidate.reputation.verifiedProofs === 1 ? '' : 's'}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <MessageSquareQuote className="size-4 text-primary" />
          <span>{candidate.reputation.endorsementCount} verification note{candidate.reputation.endorsementCount === 1 ? '' : 's'}</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span>{candidate.reputation.averageConfidence}% average trust confidence</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" variant={candidate.isSaved ? 'outline' : 'default'} onClick={() => onToggleSave(candidate)} disabled={isSaving}>
          {candidate.isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {isSaving ? 'Saving...' : candidate.isSaved ? 'Remove from shortlist' : 'Save candidate'}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/profile/${encodeURIComponent(candidate.username)}`}>View profile</Link>
        </Button>
        {candidate.strongestProof ? (
          <Button asChild variant="outline">
            <Link href={`/proof/${candidate.strongestProof.id}`}>
              <Sparkles className="size-4" />
              View strongest proof
            </Link>
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

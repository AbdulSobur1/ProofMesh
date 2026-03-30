import { Card } from '@/components/ui/card'
import { Award, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'

interface ReputationSectionProps {
  averageScore: number
  totalProofs: number
  verifiedProofs: number
  averageConfidence: number
  endorsementCount: number
}

export function ReputationSection({
  averageScore,
  totalProofs,
  verifiedProofs,
  averageConfidence,
  endorsementCount,
}: ReputationSectionProps) {
  const scorePercentage = Math.min(Math.max((averageScore / 10) * 100, 0), 100)
  const confidencePercentage = Math.min(Math.max(averageConfidence, 0), 100)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-[2rem] border border-border/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reputation score</p>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold tracking-tight text-foreground">{averageScore.toFixed(1)}</div>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Quality averaged across submitted proof.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
            <Award className="size-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-border/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total proofs</p>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold tracking-tight text-foreground">{totalProofs}</div>
              <span className="text-sm text-muted-foreground">submitted</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{endorsementCount} external verification note{endorsementCount === 1 ? '' : 's'} attached.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
            <FileText className="size-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-border/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Verified proofs</p>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold tracking-tight text-foreground">{verifiedProofs}</div>
              <span className="text-sm text-muted-foreground">trusted</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Proofs with strong enough signals to be publicly trusted.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
            <CheckCircle2 className="size-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-border/60 bg-background/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trust confidence</p>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold tracking-tight text-primary">{averageConfidence}%</div>
              <span className="text-sm text-muted-foreground">avg</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                style={{ width: `${confidencePercentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">A quick read on how convincing the current evidence is.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  )
}

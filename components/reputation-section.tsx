import { Card } from '@/components/ui/card'
import { Award, FileText, TrendingUp } from 'lucide-react'

interface ReputationSectionProps {
  averageScore: number
  totalProofs: number
}

export function ReputationSection({ averageScore, totalProofs }: ReputationSectionProps) {
  const scorePercentage = Math.min(Math.max((averageScore / 10) * 100, 0), 100)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <p className="mt-2 text-xs text-muted-foreground">Quality averaged across verified proof.</p>
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
            <p className="mt-4 text-xs text-muted-foreground">Verified submissions on record.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
            <FileText className="size-5 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-border/60 bg-background/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Score velocity</p>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-semibold tracking-tight text-primary">{averageScore.toFixed(1)}</div>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">A simple read on the quality of current proof.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-primary/10">
            <TrendingUp className="size-5 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  )
}

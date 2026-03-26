import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AiAnalysisCardProps {
  score: number
  feedback?: string | null
  tags: string[]
}

const scoreStyles = (score: number) => {
  if (score >= 9) return 'from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-600'
  if (score >= 8) return 'from-sky-500/20 via-sky-500/10 to-transparent text-sky-600'
  if (score >= 7) return 'from-blue-500/20 via-blue-500/10 to-transparent text-blue-600'
  return 'from-amber-500/20 via-amber-500/10 to-transparent text-amber-600'
}

export function AiAnalysisCard({ score, feedback, tags }: AiAnalysisCardProps) {
  const isPending = !feedback
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-4 shadow-[0_12px_36px_rgba(2,6,23,0.22)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          AI Analysis
        </div>
        <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold shadow-[0_0_18px_rgba(56,189,248,0.2)] ${scoreStyles(score)}`}>
          Score {score}/10
        </div>
      </div>

      <p className={`mt-3 text-sm text-foreground/80 ${isPending ? 'animate-pulse' : 'animate-fadeIn'}`}>
        {feedback || 'Analyzing your submission...'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-0">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}

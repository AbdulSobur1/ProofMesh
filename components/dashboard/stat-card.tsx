import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  helper?: string
  icon: ReactNode
  accent?: string
}

export function StatCard({ label, value, helper, icon, accent }: StatCardProps) {
  return (
    <Card className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_12px_40px_rgba(2,6,23,0.24)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {helper && <p className="mt-2 text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div
          className={`flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 ${accent ?? ''}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

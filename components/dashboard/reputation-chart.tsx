'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ReputationChartProps {
  data: Array<{ date: string; score: number; title: string; createdAt: string }>
  isLoading?: boolean
}

export function ReputationChart({ data, isLoading }: ReputationChartProps) {
  return (
    <Card className="rounded-[24px] border border-white/10 bg-card/70 p-6 shadow-[0_12px_40px_rgba(2,6,23,0.22)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Reputation Trend</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Score over time</h3>
        </div>
        <span className="text-xs text-muted-foreground">{data.length} submissions</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[240px] w-full rounded-2xl" />
      ) : data.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-muted-foreground">
          No reputation history yet.
        </div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.45)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6, 10, 18, 0.96)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 4, fill: '#22d3ee', strokeWidth: 2, stroke: '#0f172a' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

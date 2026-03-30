'use client'

import { Search, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DiscoverySortMode } from '@/lib/types'
import { PROFESSION_LABELS, PROOF_PROFESSIONS, type ProofProfession } from '@/lib/proof-taxonomy'

interface DiscoveryControlsProps {
  query: string
  onQueryChange: (value: string) => void
  profession: string
  onProfessionChange: (value: string) => void
  minScore: number
  onMinScoreChange: (value: number) => void
  verifiedOnly: boolean
  onVerifiedOnlyChange: (value: boolean) => void
  sortMode: DiscoverySortMode
  onSortModeChange: (value: DiscoverySortMode) => void
}

export function DiscoveryControls({
  query,
  onQueryChange,
  profession,
  onProfessionChange,
  minScore,
  onMinScoreChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  sortMode,
  onSortModeChange,
}: DiscoveryControlsProps) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-card/70 p-4 shadow-[0_12px_40px_rgba(2,6,23,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
            <Search className="size-4 text-primary" />
          </div>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by username, tag, profession, or strongest proof"
            className="max-w-2xl bg-background/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={sortMode === 'trust' ? 'default' : 'outline'} size="sm" onClick={() => onSortModeChange('trust')}>
            Trust first
          </Button>
          <Button type="button" variant={sortMode === 'score' ? 'default' : 'outline'} size="sm" onClick={() => onSortModeChange('score')}>
            Top score
          </Button>
          <Button type="button" variant={sortMode === 'proofs' ? 'default' : 'outline'} size="sm" onClick={() => onSortModeChange('proofs')}>
            Most proofs
          </Button>
          <Button type="button" variant={sortMode === 'endorsements' ? 'default' : 'outline'} size="sm" onClick={() => onSortModeChange('endorsements')}>
            Most endorsed
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={profession}
          onChange={(event) => onProfessionChange(event.target.value)}
          className="h-10 rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
        >
          <option value="">All professions</option>
          {PROOF_PROFESSIONS.map((item) => (
            <option key={item} value={item}>
              {PROFESSION_LABELS[item as ProofProfession]}
            </option>
          ))}
        </select>

        <select
          value={minScore}
          onChange={(event) => onMinScoreChange(Number(event.target.value))}
          className="h-10 rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none"
        >
          <option value={0}>Any score</option>
          <option value={6}>6+</option>
          <option value={7}>7+</option>
          <option value={8}>8+</option>
          <option value={9}>9+</option>
        </select>

        <Button
          type="button"
          variant={verifiedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
        >
          <ShieldCheck className="size-4" />
          Trusted only
        </Button>
      </div>
    </div>
  )
}

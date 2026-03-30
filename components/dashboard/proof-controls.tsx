'use client'

import { Search, Filter, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProofSortMode } from '@/lib/types'

interface ProofControlsProps {
  query: string
  onQueryChange: (value: string) => void
  selectedTag: string
  onTagChange: (value: string) => void
  sortMode: ProofSortMode
  onSortModeChange: (value: ProofSortMode) => void
  tags: Array<{ tag: string }>
  minScore: number
  onMinScoreChange: (value: number) => void
}

export function ProofControls({
  query,
  onQueryChange,
  selectedTag,
  onTagChange,
  sortMode,
  onSortModeChange,
  tags,
  minScore,
  onMinScoreChange,
}: ProofControlsProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_40px_rgba(2,6,23,0.18)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Search className="size-4 text-primary" />
          </div>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by title, description, or tag"
            className="max-w-2xl bg-white/[0.04]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={sortMode === 'newest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortModeChange('newest')}
          >
            Recent
          </Button>
          <Button
            type="button"
            variant={sortMode === 'highest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortModeChange('highest')}
          >
            Top Score
          </Button>
          <Button
            type="button"
            variant={sortMode === 'oldest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortModeChange('oldest')}
          >
            Oldest
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Filter className="size-3.5" />
          Tags
        </div>
        <Button
          type="button"
          size="sm"
          variant={selectedTag === '' ? 'default' : 'outline'}
          onClick={() => onTagChange('')}
        >
          All
        </Button>
        {tags.slice(0, 6).map(({ tag }) => (
          <Button
            type="button"
            key={tag}
            size="sm"
            variant={selectedTag === tag ? 'default' : 'outline'}
            onClick={() => onTagChange(tag)}
          >
            {tag}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Min score</span>
          <select
            value={minScore}
            onChange={(event) => onMinScoreChange(Number(event.target.value))}
            className="bg-transparent text-xs font-semibold text-foreground outline-none"
          >
            <option value={0}>Any</option>
            <option value={6}>6+</option>
            <option value={7}>7+</option>
            <option value={8}>8+</option>
            <option value={9}>9+</option>
          </select>
        </div>
      </div>
    </div>
  )
}

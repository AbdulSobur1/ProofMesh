import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ProofCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-border/60 p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-5 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-14 rounded-xl" />
      </div>
    </Card>
  )
}

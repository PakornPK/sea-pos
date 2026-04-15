import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  columns?: number
  rows?: number
  /** Show a row of filter chips above the table. */
  withFilters?: boolean
  /** Show a search bar + action button row above the table. */
  withToolbar?: boolean
}

export function TableSkeleton({
  columns = 6,
  rows = 8,
  withFilters = false,
  withToolbar = false,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {withToolbar && (
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-9 w-32" />
        </div>
      )}

      {withFilters && (
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] overflow-hidden">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 grid gap-4"
             style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r}
               className="border-b border-border/60 px-4 py-3 grid gap-4 last:border-0"
               style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 rounded-lg" style={{ width: `${60 + ((r + c) * 7) % 35}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

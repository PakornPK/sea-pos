import { Skeleton } from '@/components/ui/skeleton'

/**
 * Generic page skeleton: header row + a few content blocks.
 * Used as the default dashboard loading.tsx fallback.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  )
}

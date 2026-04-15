import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>

      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-32" />

      <div className="flex gap-4" style={{ height: 'calc(100vh - 8.5rem)' }}>
        {/* Left: product grid */}
        <div className="flex flex-col flex-1 gap-3 overflow-hidden">
          <Skeleton className="h-9 w-full" />
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right: cart panel */}
        <div className="w-80 shrink-0 flex flex-col border rounded-xl bg-card overflow-hidden">
          <Skeleton className="h-11 border-b rounded-none" />
          <div className="flex-1 p-3 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="border-t p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="ml-auto h-8 w-20" />
      </div>

      <div className="border rounded-xl p-6 space-y-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-28 mx-auto" />
          <Skeleton className="h-3 w-40 mx-auto" />
        </div>

        <div className="border-t pt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        <div className="border-t pt-3 flex justify-between items-baseline">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4 max-w-xl">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  )
}

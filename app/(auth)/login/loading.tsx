import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="text-center space-y-2">
        <Skeleton className="h-7 w-28 mx-auto" />
        <Skeleton className="h-3 w-40 mx-auto" />
      </div>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full mt-2" />
    </div>
  )
}

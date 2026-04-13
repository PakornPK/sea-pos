import { Skeleton } from '@/components/ui/skeleton'

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="flex max-w-md flex-col gap-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 mt-2" />
    </div>
  )
}

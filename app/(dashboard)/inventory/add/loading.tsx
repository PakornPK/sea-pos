import { Skeleton } from '@/components/ui/skeleton'
import { FormSkeleton } from '@/components/loading/FormSkeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-32" />
      </div>
      <FormSkeleton fields={6} />
    </div>
  )
}

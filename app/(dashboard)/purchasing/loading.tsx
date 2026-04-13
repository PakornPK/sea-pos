import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/loading/TableSkeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <TableSkeleton columns={8} rows={10} withFilters />
    </div>
  )
}

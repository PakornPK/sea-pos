import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/loading/TableSkeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-9 w-32" />
      <TableSkeleton columns={4} rows={6} />
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/loading/TableSkeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-32" />
      </div>
      <TableSkeleton columns={5} rows={6} withToolbar />
    </div>
  )
}

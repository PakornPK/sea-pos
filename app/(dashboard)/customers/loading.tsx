import { Skeleton } from '@/components/ui/skeleton'
import { TableSkeleton } from '@/components/loading/TableSkeleton'

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
      </div>
      <TableSkeleton columns={6} rows={8} withToolbar />
    </div>
  )
}

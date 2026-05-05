'use client'

import { useLowStock } from '@/hooks/use-dashboard'
import { LowStockList } from '@/components/dashboard/LowStockList'
import { Skeleton } from '@/components/ui/skeleton'

interface Props { branchId: string | null }

export function LowStockWidget({ branchId }: Props) {
  const { data, loading, error } = useLowStock(8, branchId)

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60 space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full rounded-lg" />)}
      </div>
    )
  }
  if (error || !data) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
  return <LowStockList items={data} />
}

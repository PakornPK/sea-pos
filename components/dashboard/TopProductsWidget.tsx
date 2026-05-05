'use client'

import { useDashboardTopProducts } from '@/hooks/use-dashboard'
import { TopProductsBar } from '@/components/dashboard/TopProductsBar'
import { Skeleton } from '@/components/ui/skeleton'

interface Props { branchId: string | null }

export function TopProductsWidget({ branchId }: Props) {
  const { data, loading, error } = useDashboardTopProducts(30, 5, branchId)

  if (loading) return <Skeleton className="h-[270px] rounded-2xl" />
  if (error || !data) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
  return <TopProductsBar data={data} />
}

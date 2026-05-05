'use client'

import { useDailySeries } from '@/hooks/use-dashboard'
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart'
import { Skeleton } from '@/components/ui/skeleton'

interface Props { branchId: string | null }

export function RevenueTrendWidget({ branchId }: Props) {
  const { data, loading, error } = useDailySeries(7, branchId)

  if (loading) return <Skeleton className="h-[270px] rounded-2xl" />
  if (error || !data) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
  return <RevenueTrendChart data={data} />
}

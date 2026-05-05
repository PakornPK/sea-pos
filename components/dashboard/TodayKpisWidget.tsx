'use client'

import { DollarSign, Receipt, ShoppingBag, TrendingUp } from 'lucide-react'
import { useTodaySummary } from '@/hooks/use-today-summary'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBaht } from '@/lib/format'

interface Props { branchId: string | null }

export function TodayKpisWidget({ branchId }: Props) {
  const { data: s, loading, error } = useTodaySummary(branchId)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
      </div>
    )
  }
  if (error || !s) {
    return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="รายได้วันนี้"  value={formatBaht(s.revenue)}                 icon={DollarSign}  color="blue"   />
      <KpiCard label="จำนวนบิล"      value={s.billCount.toLocaleString('th-TH')}    icon={Receipt}     color="green"  />
      <KpiCard label="ยอดเฉลี่ย/บิล" value={formatBaht(s.avgBill)}                 icon={TrendingUp}  color="purple" />
      <KpiCard label="ชิ้นที่ขาย"    value={s.itemsSold.toLocaleString('th-TH')}   icon={ShoppingBag} color="orange" />
    </div>
  )
}

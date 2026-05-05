'use client'

import { useSalesByRange } from '@/hooks/use-reports'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ExportButton } from '@/components/reports/ExportButton'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBaht } from '@/lib/format'

interface Props {
  start: string      // ISO timestamp
  end: string        // ISO timestamp
  startDate: string  // YYYY-MM-DD for export
  endDate: string
  branchId: string | null
}

export function SalesSummarySection({ start, end, startDate, endDate, branchId }: Props) {
  const { data: s, loading, error } = useSalesByRange(start, end, branchId)

  if (loading) return <SalesSkeleton />
  if (error || !s) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>

  const profitColor = s.gross_profit > 0 ? 'text-emerald-600' : s.gross_profit < 0 ? 'text-red-600' : ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">สรุปยอดขาย</h2>
        <ExportButton kind="sales" start={startDate} end={endDate} branchId={branchId} label="ดาวน์โหลดรายการขาย" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="รายได้รวม"    value={formatBaht(s.totalRevenue)} />
        <KpiCard label="จำนวนบิล"     value={s.billCount.toLocaleString('th-TH')} />
        <KpiCard label="ยอดเฉลี่ย/บิล" value={formatBaht(s.avgBill)} />
        <KpiCard label="ยกเลิก"       value={s.voidedCount.toLocaleString('th-TH')} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="ต้นทุนสินค้า (COGS)" value={formatBaht(s.cogs)} />
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted-foreground">กำไรขั้นต้น</p>
          <p className={`text-[28px] font-bold tabular-nums tracking-tight leading-none ${profitColor}`}>
            {formatBaht(s.gross_profit)}
          </p>
        </div>
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted-foreground">Margin</p>
          <p className={`text-[28px] font-bold tabular-nums tracking-tight leading-none ${profitColor}`}>
            {s.profit_margin.toFixed(1)}%
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">คำนวณจากยอดขายที่มีข้อมูลต้นทุน</p>
        </div>
        <KpiCard
          label="ต้นทุน/รายได้"
          value={s.totalRevenue > 0 ? `${((s.cogs / s.totalRevenue) * 100).toFixed(1)}%` : '—'}
        />
      </div>
    </div>
  )
}

function SalesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
      </div>
    </div>
  )
}

'use client'

import { useVatSummary } from '@/hooks/use-reports'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ExportButton } from '@/components/reports/ExportButton'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBaht } from '@/lib/format'
import { sub } from '@/lib/money'
import type { VatConfig } from '@/lib/vat'

interface Props {
  start: string
  end: string
  startDate: string
  endDate: string
  branchId: string | null
  vatConfig: VatConfig
}

export function VatReportSection({ start, end, startDate, endDate, branchId, vatConfig }: Props) {
  const { data, loading, error } = useVatSummary(start, end, branchId)

  if (vatConfig.mode === 'none') return null
  if (loading) return <VatSkeleton />
  if (error || !data) return <p className="text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>

  const [sales, purchases] = data
  const netVat = sub(sales.vatOutput, purchases.vatInput)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          ภาษีมูลค่าเพิ่ม ({vatConfig.rate}% · {vatConfig.mode === 'included' ? 'รวม VAT แล้ว' : 'ไม่รวม VAT'})
        </h2>
        <ExportButton kind="vat" start={startDate} end={endDate} branchId={branchId} label="ดาวน์โหลดรายการ VAT" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="ยอดขายก่อน VAT"        value={formatBaht(sales.netSales)} />
        <KpiCard label="VAT ขาย (Output)"       value={formatBaht(sales.vatOutput)} />
        <KpiCard label="ยอดขายรวม VAT"          value={formatBaht(sales.grossSales)} />
        <KpiCard
          label="บิลที่มี VAT / ยกเว้น"
          value={`${sales.vatBills.toLocaleString('th-TH')} / ${sales.zeroBills.toLocaleString('th-TH')}`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="ยอดซื้อก่อน VAT"        value={formatBaht(purchases.netPurchases)} />
        <KpiCard label="VAT ซื้อ (Input)"        value={formatBaht(purchases.vatInput)} />
        <KpiCard label="ยอดซื้อรวม VAT"          value={formatBaht(purchases.grossPurchases)} />
        <KpiCard
          label="PO ที่มี VAT / ยกเว้น"
          value={`${purchases.vatPos.toLocaleString('th-TH')} / ${purchases.zeroPos.toLocaleString('th-TH')}`}
        />
      </div>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">VAT สุทธิ (ขาย − ซื้อ)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {netVat >= 0 ? 'ยอดที่ต้องชำระให้กรมสรรพากร' : 'ยอดภาษีซื้อมากกว่าภาษีขาย — ยกยอดหรือขอคืน'}
          </p>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${netVat < 0 ? 'text-emerald-600' : ''}`}>
          {formatBaht(netVat)}
        </p>
      </div>
    </div>
  )
}

function VatSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
      </div>
    </div>
  )
}

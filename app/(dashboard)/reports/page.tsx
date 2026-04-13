import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo } from '@/lib/repositories'
import { formatBaht, formatDateTime } from '@/lib/format'
import { parseDateRange, type DateRange } from '@/lib/daterange'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { ExportButton } from '@/components/reports/ExportButton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'รายงาน | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager']

function humanRange(r: DateRange): string {
  if (r.matchingPreset) return `${r.matchingPreset} วันล่าสุด`
  return `${r.startDate}  ถึง  ${r.endDate}`
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  await requirePageRole(ALLOWED)
  const sp = await searchParams
  const range = parseDateRange(sp)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">รายงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">{humanRange(range)}</p>
        </div>
        <DateRangePicker
          currentStart={range.startDate}
          currentEnd={range.endDate}
          activePreset={range.matchingPreset}
        />
      </div>

      <Suspense key={range.startIso + range.endIso} fallback={<KpiSkeleton />}>
        <SalesSummary range={range} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense key={'iv-' + range.startIso} fallback={<BlockSkeleton />}>
          <InventoryValueReport />
        </Suspense>
        <Suspense key={'mv-' + range.startIso + range.endIso} fallback={<BlockSkeleton />}>
          <StockMovementReport range={range} />
        </Suspense>
      </div>
    </div>
  )
}

async function SalesSummary({ range }: { range: DateRange }) {
  await requirePageRole(ALLOWED)
  const s = await analyticsRepo.salesByRange(range.startIso, range.endIso)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">สรุปยอดขาย</h2>
        <ExportButton
          kind="sales"
          start={range.startDate}
          end={range.endDate}
          label="ดาวน์โหลดรายการขาย"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="รายได้รวม" value={formatBaht(s.totalRevenue)} />
        <KpiCard label="จำนวนบิล" value={s.billCount.toLocaleString('th-TH')} />
        <KpiCard label="ยอดเฉลี่ย/บิล" value={formatBaht(s.avgBill)} />
        <KpiCard label="ยกเลิก" value={s.voidedCount.toLocaleString('th-TH')} />
      </div>
    </div>
  )
}

async function InventoryValueReport() {
  await requirePageRole(ALLOWED)
  const rows = await analyticsRepo.inventoryValueByCategory()
  const grandTotal = rows.reduce((s, r) => s + r.stock_value, 0)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">มูลค่าสต๊อกตามหมวดหมู่</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">รวม {formatBaht(grandTotal)}</p>
          <ExportButton kind="inventory" />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีสินค้า</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead className="text-right">จำนวนรายการ</TableHead>
              <TableHead className="text-right">มูลค่า (ราคาทุน)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.category_id ?? '__uncat__'}>
                <TableCell>{r.category_name}</TableCell>
                <TableCell className="text-right tabular-nums">{r.item_count}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBaht(r.stock_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

async function StockMovementReport({ range }: { range: DateRange }) {
  await requirePageRole(ALLOWED)
  const rows = await analyticsRepo.stockMovements({
    start: range.startIso,
    end: range.endIso,
    limit: 200,
  })

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">การเคลื่อนไหวสต๊อก</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{rows.length} รายการ</p>
          <ExportButton
            kind="stock-movements"
            start={range.startDate}
            end={range.endDate}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการเคลื่อนไหว</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันเวลา</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead>เหตุผล</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">{r.product_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.change > 0 ? 'secondary' : 'destructive'} className="tabular-nums">
                      {r.change > 0 ? `+${r.change}` : r.change}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.reason ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function BlockSkeleton() {
  return <Skeleton className="h-[360px] rounded-lg" />
}

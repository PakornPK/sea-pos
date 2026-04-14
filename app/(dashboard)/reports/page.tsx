import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo, companyRepo } from '@/lib/repositories'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { getVatConfig } from '@/lib/vat'
import { formatBaht, formatDateTime } from '@/lib/format'
import { sumBy, sub } from '@/lib/money'
import { parseDateRange, type DateRange } from '@/lib/daterange'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { ExportButton } from '@/components/reports/ExportButton'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
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
  searchParams: Promise<{ start?: string; end?: string; branch?: string }>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const sp = await searchParams
  const range = parseDateRange(sp)
  const branchId = resolveBranchFilter(me, sp.branch)
  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const isAllBranches = branchId === null
  const key = `${range.startIso}-${range.endIso}-${branchId ?? 'all'}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">รายงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">{humanRange(range)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <BranchScopeToggle
              basePath="/reports"
              searchParams={sp}
              isAllBranches={isAllBranches}
              activeBranchLabel={null}
            />
          )}
          <DateRangePicker
            currentStart={range.startDate}
            currentEnd={range.endDate}
            activePreset={range.matchingPreset}
          />
        </div>
      </div>

      <Suspense key={`sum-${key}`} fallback={<KpiSkeleton />}>
        <SalesSummary range={range} branchId={branchId} />
      </Suspense>

      <Suspense key={`vat-${key}`} fallback={<KpiSkeleton />}>
        <VatReport range={range} branchId={branchId} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense key={`iv-${branchId ?? 'all'}`} fallback={<BlockSkeleton />}>
          <InventoryValueReport branchId={branchId} />
        </Suspense>
        <Suspense key={`mv-${key}`} fallback={<BlockSkeleton />}>
          <StockMovementReport range={range} branchId={branchId} />
        </Suspense>
      </div>
    </div>
  )
}

async function SalesSummary({ range, branchId }: { range: DateRange; branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const s = await analyticsRepo.salesByRange(range.startIso, range.endIso, { branchId })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">สรุปยอดขาย</h2>
        <ExportButton
          kind="sales"
          start={range.startDate}
          end={range.endDate}
          branchId={branchId}
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

async function InventoryValueReport({ branchId }: { branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const rows = await analyticsRepo.inventoryValueByCategory({ branchId })
  const grandTotal = sumBy(rows, (r) => r.stock_value)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">มูลค่าสต๊อกตามหมวดหมู่</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">รวม {formatBaht(grandTotal)}</p>
          <ExportButton kind="inventory" branchId={branchId} />
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

async function StockMovementReport({ range, branchId }: { range: DateRange; branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const rows = await analyticsRepo.stockMovements({
    start: range.startIso,
    end: range.endIso,
    branchId,
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
            branchId={branchId}
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

async function VatReport({ range, branchId }: { range: DateRange; branchId: string | null }) {
  const { me } = await requirePageRole(ALLOWED)
  const [sales, purchases, company] = await Promise.all([
    analyticsRepo.vatSummary(range.startIso, range.endIso, { branchId }),
    analyticsRepo.purchaseVatSummary(range.startIso, range.endIso, { branchId }),
    me.companyId ? companyRepo.getById(me.companyId) : Promise.resolve(null),
  ])
  const vat = getVatConfig(company)
  if (vat.mode === 'none') return null

  // Net VAT liability: what you owe the RD (or get refunded if negative).
  const netVat = sub(sales.vatOutput, purchases.vatInput)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          ภาษีมูลค่าเพิ่ม ({vat.rate}% · {vat.mode === 'included' ? 'รวม VAT แล้ว' : 'ไม่รวม VAT'})
        </h2>
        <ExportButton
          kind="vat"
          start={range.startDate}
          end={range.endDate}
          branchId={branchId}
          label="ดาวน์โหลดรายการ VAT"
        />
      </div>

      {/* Output VAT (sales) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="ยอดขายก่อน VAT" value={formatBaht(sales.netSales)} />
        <KpiCard label="VAT ขาย (Output)" value={formatBaht(sales.vatOutput)} />
        <KpiCard label="ยอดขายรวม VAT" value={formatBaht(sales.grossSales)} />
        <KpiCard
          label="บิลที่มี VAT / ยกเว้น"
          value={`${sales.vatBills.toLocaleString('th-TH')} / ${sales.zeroBills.toLocaleString('th-TH')}`}
        />
      </div>

      {/* Input VAT (received POs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="ยอดซื้อก่อน VAT" value={formatBaht(purchases.netPurchases)} />
        <KpiCard label="VAT ซื้อ (Input)" value={formatBaht(purchases.vatInput)} />
        <KpiCard label="ยอดซื้อรวม VAT" value={formatBaht(purchases.grossPurchases)} />
        <KpiCard
          label="PO ที่มี VAT / ยกเว้น"
          value={`${purchases.vatPos.toLocaleString('th-TH')} / ${purchases.zeroPos.toLocaleString('th-TH')}`}
        />
      </div>

      {/* Net liability for ภ.พ.30 */}
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
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

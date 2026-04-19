import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo, companyRepo, productRepo, productCostItemRepo, optionRepo } from '@/lib/repositories'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { getVatConfig } from '@/lib/vat'
import { formatBaht, formatDateTime } from '@/lib/format'
import { sumBy, sub } from '@/lib/money'
import { parseDateRange, type DateRange } from '@/lib/daterange'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { ExportButton } from '@/components/reports/ExportButton'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { CostProductPicker } from '@/components/reports/CostProductPicker'
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
  searchParams: Promise<{ start?: string; end?: string; branch?: string; cost_product?: string }>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const sp = await searchParams
  const range = parseDateRange(sp)
  const branchId = resolveBranchFilter(me, sp.branch)
  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const isAllBranches = branchId === null
  const key = `${range.startIso}-${range.endIso}-${branchId ?? 'all'}`
  const costProductId = sp.cost_product ?? null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">รายงาน</h1>
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

      <Suspense key={`top-${key}`} fallback={<BlockSkeleton />}>
        <TopProductsReport range={range} branchId={branchId} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense key={`iv-${branchId ?? 'all'}`} fallback={<BlockSkeleton />}>
          <InventoryValueReport branchId={branchId} />
        </Suspense>
        <Suspense key={`mv-${key}`} fallback={<BlockSkeleton />}>
          <StockMovementReport range={range} branchId={branchId} />
        </Suspense>
      </div>

      <Suspense key={`cost-${costProductId ?? 'none'}`} fallback={<BlockSkeleton />}>
        <CostStructureReport selectedProductId={costProductId} />
      </Suspense>
    </div>
  )
}

async function SalesSummary({ range, branchId }: { range: DateRange; branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const s = await analyticsRepo.salesByRange(range.startIso, range.endIso, { branchId })

  const profitColor = s.gross_profit > 0
    ? 'text-emerald-600'
    : s.gross_profit < 0
      ? 'text-red-600'
      : ''

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
          <p className="text-[11px] text-muted-foreground leading-tight">
            คำนวณจากยอดขายที่มีข้อมูลต้นทุน
          </p>
        </div>
        <KpiCard label="ต้นทุน/รายได้" value={s.totalRevenue > 0 ? `${((s.cogs / s.totalRevenue) * 100).toFixed(1)}%` : '—'} />
      </div>
    </div>
  )
}

async function InventoryValueReport({ branchId }: { branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const rows = await analyticsRepo.inventoryValueByCategory({ branchId })
  const grandTotal = sumBy(rows, (r) => r.stock_value)

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
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
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
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

async function TopProductsReport({ range, branchId }: { range: DateRange; branchId: string | null }) {
  await requirePageRole(ALLOWED)
  const days = range.matchingPreset ?? 30
  const rows = await analyticsRepo.topProducts(Number(days), 10, { branchId })

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <h3 className="font-semibold text-sm mb-3">สินค้าขายดี (ตามช่วงวันที่เลือก)</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>สินค้า</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">รายได้</TableHead>
              <TableHead className="text-right">ต้นทุน (COGS)</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const marginColor = r.margin_pct > 0 ? 'text-emerald-600' : r.margin_pct < 0 ? 'text-red-600' : ''
              return (
                <TableRow key={r.product_id}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.name}</p>
                    {r.sku && <p className="text-xs text-muted-foreground">{r.sku}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantity.toLocaleString('th-TH')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBaht(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBaht(r.cogs)}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${marginColor}`}>
                    {r.margin_pct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

async function CostStructureReport({ selectedProductId }: { selectedProductId: string | null }) {
  await requirePageRole(ALLOWED)
  const products = await productRepo.listAll()
  const productIds = products.map((p) => p.id)

  const [allCostItems, optionGroups] = await Promise.all([
    productCostItemRepo.listForProducts(productIds),
    selectedProductId ? optionRepo.listForProduct(selectedProductId) : Promise.resolve([]),
  ])

  // Index cost items by product_id
  const itemsByProduct = new Map<string, typeof allCostItems>()
  for (const item of allCostItems) {
    const list = itemsByProduct.get(item.product_id) ?? []
    list.push(item)
    itemsByProduct.set(item.product_id, list)
  }

  // Index product cost (used for option ingredient lookup)
  const productCostMap = new Map(products.map((p) => [p.id, p.cost]))
  // Index product names for linked_product_id lookup
  const productNameMap = new Map(products.map((p) => [p.id, p.name]))

  // All products for the picker, sorted by name
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, 'th'))

  const selected = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null

  const selectedItems = selected ? (itemsByProduct.get(selected.id) ?? []) : []
  const hasBom = selectedItems.length > 0
  // Show all option groups (even those without linked ingredients)
  const groupsWithLinks = optionGroups

  // Server-side debug log — check your terminal
  if (selectedProductId) {
    console.log('[BOM Report] product:', selected?.name, '| BOM items:', selectedItems.length, '| option groups:', optionGroups.length, '| groups detail:', JSON.stringify(optionGroups.map(g => ({ id: g.id, name: g.name, options: g.options.length }))))
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold text-sm">โครงสร้างต้นทุนสินค้า (BOM)</h3>
        <CostProductPicker
          products={sortedProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))}
          currentId={selectedProductId}
        />
      </div>

      {!selected ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          เลือกสินค้าด้านบนเพื่อดูโครงสร้างต้นทุน
        </p>
      ) : (!hasBom && groupsWithLinks.length === 0) ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selected.name}</span> ยังไม่ได้กำหนดส่วนประกอบต้นทุน
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ตั้งค่าได้ที่หน้าแก้ไขสินค้า → ส่วน &quot;โครงสร้างต้นทุน&quot; หรือ &quot;ตัวเลือกสินค้า&quot;
          </p>
        </div>
      ) : (() => {
        const bomTotal = selectedItems.reduce((acc, it) => acc + it.quantity * it.unit_cost, 0)

        // For margin range: use min/max option cost across required groups
        // For header range: find best and worst margin across all option combos in required groups.
        // Sell price = base + price_delta, cost = BOM + ingredient cost.
        const requiredGroups = groupsWithLinks.filter((g) => g.required)
        // Compute per-option (margin = sell - cost) for each option in each required group,
        // then pick min/max margin scenario.
        let minMargin: number | null = null
        let maxMargin: number | null = null
        if (requiredGroups.length > 0 && selected.price > 0) {
          for (const g of requiredGroups) {
            for (const o of g.options) {
              const ingCost = o.linked_product_id
                ? (productCostMap.get(o.linked_product_id) ?? 0) * (o.quantity_per_use ?? 1)
                : 0
              const totalCost = bomTotal + ingCost
              const sellPrice = selected.price + (o.price_delta ?? 0)
              const m = sellPrice > 0 ? ((sellPrice - totalCost) / sellPrice) * 100 : 0
              if (minMargin === null || m < minMargin) minMargin = m
              if (maxMargin === null || m > maxMargin) maxMargin = m
            }
          }
        } else if (selected.price > 0) {
          const m = ((selected.price - bomTotal) / selected.price) * 100
          minMargin = m
          maxMargin = m
        }
        const hasRange = minMargin !== null && maxMargin !== null && Math.abs(maxMargin - minMargin) > 0.01

        return (
          <div className="space-y-5">
            {/* Header summary */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b">
              <div>
                <span className="font-semibold">{selected.name}</span>
                {selected.sku && (
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{selected.sku}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm tabular-nums flex-wrap">
                <span className="text-muted-foreground">
                  ราคาขาย {hasRange ? `${formatBaht(selected.price)}+` : formatBaht(selected.price)}
                </span>
                {hasBom && <span>BOM {formatBaht(bomTotal)}</span>}
                {minMargin !== null && maxMargin !== null && (
                  <span className={`font-semibold ${(minMargin > 0 ? minMargin : maxMargin) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Margin {hasRange ? `${minMargin.toFixed(1)}–${maxMargin.toFixed(1)}%` : `${maxMargin.toFixed(1)}%`}
                  </span>
                )}
              </div>
            </div>

            {/* Fixed BOM */}
            {hasBom && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  ต้นทุนคงที่ (BOM)
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ส่วนประกอบ</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ราคาทุน/หน่วย</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item) => {
                      const subtotal = item.quantity * item.unit_cost
                      const linkedName = item.linked_product_id
                        ? productNameMap.get(item.linked_product_id)
                        : null
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {item.name}
                            {linkedName && linkedName !== item.name && (
                              <span className="ml-1.5 text-xs text-muted-foreground">({linkedName})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {formatBaht(item.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            {formatBaht(subtotal)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2 font-semibold bg-muted/30">
                      <TableCell colSpan={3} className="text-sm">รวม BOM</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatBaht(bomTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Variable cost from options */}
            {groupsWithLinks.length === 0 && (
              <p className="text-xs text-muted-foreground pt-2">
                ไม่มีตัวเลือก (option groups: {optionGroups.length})
              </p>
            )}
            {groupsWithLinks.map((group) => {
              return (
                <div key={group.id}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    ตัวเลือก: {group.name}
                    <span className="ml-2 normal-case font-normal">
                      ({group.required ? 'จำเป็น' : 'ไม่จำเป็น'} · {group.multi_select ? 'เลือกหลาย' : 'เลือกเดียว'})
                    </span>
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ตัวเลือก</TableHead>
                        <TableHead>วัตถุดิบ</TableHead>
                        <TableHead className="text-right">ปริมาณ</TableHead>
                        <TableHead className="text-right">ต้นทุน/หน่วย</TableHead>
                        <TableHead className="text-right">ต้นทุนตัวเลือก</TableHead>
                        <TableHead className="text-right">ต้นทุนรวม</TableHead>
                        <TableHead className="text-right">ราคาขาย</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.options.map((opt) => {
                        const unitCost = opt.linked_product_id
                          ? (productCostMap.get(opt.linked_product_id) ?? 0)
                          : 0
                        const ingCost = unitCost * (opt.quantity_per_use ?? 1)
                        const noCostConfigured = opt.linked_product_id && unitCost === 0
                        const totalWithOpt = bomTotal + ingCost
                        const sellPrice = selected.price + (opt.price_delta ?? 0)
                        const margin = sellPrice > 0
                          ? ((sellPrice - totalWithOpt) / sellPrice) * 100
                          : null
                        const marginColor = margin === null ? '' : margin > 0 ? 'text-emerald-600' : 'text-red-600'
                        const ingName = opt.linked_product_id
                          ? productNameMap.get(opt.linked_product_id)
                          : null
                        return (
                          <TableRow key={opt.id}>
                            <TableCell className="text-sm font-medium">{opt.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {ingName ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {opt.linked_product_id
                                ? ((opt.quantity_per_use ?? 1) % 1 === 0
                                  ? opt.quantity_per_use ?? 1
                                  : (opt.quantity_per_use ?? 1).toFixed(3))
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {opt.linked_product_id ? (
                                <span className={noCostConfigured ? 'text-amber-500' : ''}>
                                  {formatBaht(unitCost)}
                                  {noCostConfigured && <span className="ml-1 text-[10px]">(!)</span>}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {opt.linked_product_id ? formatBaht(ingCost) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-medium">
                              {formatBaht(totalWithOpt)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {formatBaht(sellPrice)}
                              {opt.price_delta !== 0 && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  ({opt.price_delta > 0 ? '+' : ''}{formatBaht(opt.price_delta)})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={`text-right tabular-nums text-sm font-semibold ${marginColor}`}>
                              {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

function BlockSkeleton() {
  return <Skeleton className="h-[360px] rounded-2xl" />
}

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DollarSign, Receipt, ShoppingBag, TrendingUp } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo } from '@/lib/repositories'
import { formatBaht } from '@/lib/format'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart'
import { PaymentMixDonut } from '@/components/dashboard/PaymentMixDonut'
import { TopProductsBar } from '@/components/dashboard/TopProductsBar'
import { LowStockList } from '@/components/dashboard/LowStockList'
import { RecentSalesList } from '@/components/dashboard/RecentSalesList'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'ภาพรวมร้าน | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager']

export default async function DashboardPage() {
  await requirePageRole(ALLOWED)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">ภาพรวมร้าน</h1>
        <p className="text-sm text-muted-foreground mt-1">
          สรุปยอดขาย สินค้า และการซื้อในวันนี้
        </p>
      </div>

      <Suspense fallback={<KpiRowSkeleton />}>
        <TodayKpis />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueTrendWidget />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton />}>
          <PaymentMixWidget />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<ChartSkeleton />}>
          <TopProductsWidget />
        </Suspense>
        <Suspense fallback={<ListSkeleton />}>
          <LowStockWidget />
        </Suspense>
      </div>

      <Suspense fallback={<ListSkeleton rows={10} />}>
        <RecentSalesWidget />
      </Suspense>
    </div>
  )
}

// ─── Streamed widgets ───────────────────────────────────────────────────────

async function TodayKpis() {
  await requirePageRole(ALLOWED)
  const s = await analyticsRepo.todaySummary()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="รายได้วันนี้" value={formatBaht(s.revenue)} icon={DollarSign} />
      <KpiCard label="จำนวนบิล"     value={s.billCount.toLocaleString('th-TH')} icon={Receipt} />
      <KpiCard label="ยอดเฉลี่ย/บิล" value={formatBaht(s.avgBill)}   icon={TrendingUp} />
      <KpiCard label="ชิ้นที่ขาย"   value={s.itemsSold.toLocaleString('th-TH')} icon={ShoppingBag} />
    </div>
  )
}

async function RevenueTrendWidget() {
  await requirePageRole(ALLOWED)
  const data = await analyticsRepo.dailySeries(7)
  return <RevenueTrendChart data={data} />
}

async function PaymentMixWidget() {
  await requirePageRole(ALLOWED)
  const data = await analyticsRepo.paymentMix(30)
  return <PaymentMixDonut data={data} />
}

async function TopProductsWidget() {
  await requirePageRole(ALLOWED)
  const data = await analyticsRepo.topProducts(30, 5)
  return <TopProductsBar data={data} />
}

async function LowStockWidget() {
  await requirePageRole(ALLOWED)
  const items = await analyticsRepo.lowStock(8)
  return <LowStockList items={items} />
}

async function RecentSalesWidget() {
  await requirePageRole(ALLOWED)
  const sales = await analyticsRepo.recentSales(10)
  return <RecentSalesList sales={sales} />
}

// ─── Skeletons for Suspense fallbacks ───────────────────────────────────────

function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[88px] rounded-lg" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[270px] rounded-lg" />
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-32 mb-2" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-client'
import { useSearchParams } from 'next/navigation'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { TodayKpisWidget } from '@/components/dashboard/TodayKpisWidget'
import { RevenueTrendWidget } from '@/components/dashboard/RevenueTrendWidget'
import { PaymentMixWidget } from '@/components/dashboard/PaymentMixWidget'
import { TopProductsWidget } from '@/components/dashboard/TopProductsWidget'
import { LowStockWidget } from '@/components/dashboard/LowStockWidget'
import { RecentSalesWidget } from '@/components/dashboard/RecentSalesWidget'

export default function DashboardPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()

  if (!user) return null  // AuthGuard handles redirect

  const branchId = resolveBranchFilter(user, searchParams.get('branch') ?? undefined)
  const isAdmin = user.role === 'admin' || user.isPlatformAdmin
  const isAllBranches = branchId === null

  const sp: Record<string, string> = {}
  searchParams.forEach((value, key) => { sp[key] = value })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">ภาพรวมร้าน</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            สรุปยอดขาย สินค้า และการซื้อในวันนี้
          </p>
        </div>
        {isAdmin && (
          <BranchScopeToggle
            basePath="/dashboard/"
            searchParams={sp}
            isAllBranches={isAllBranches}
            activeBranchLabel={null}
          />
        )}
      </div>

      <TodayKpisWidget branchId={branchId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueTrendWidget branchId={branchId} />
        </div>
        <PaymentMixWidget branchId={branchId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsWidget branchId={branchId} />
        <LowStockWidget branchId={branchId} />
      </div>

      <RecentSalesWidget branchId={branchId} />
    </div>
  )
}

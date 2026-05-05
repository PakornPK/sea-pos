'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Truck } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { PurchasingSection } from '@/components/purchasing/PurchasingSection'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function PurchasingPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">ใบสั่งซื้อ</h1>
        <div className="flex items-center gap-2">
          <Link href="/purchasing/suppliers/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Truck className="mr-1 h-4 w-4" />
            ผู้จำหน่าย
          </Link>
          <Link href="/purchasing/new/" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="mr-1 h-4 w-4" />
            สร้างใบสั่งซื้อ
          </Link>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton columns={8} rows={10} withFilters />}>
        <PurchasingSection
          role={user.role}
          companyId={user.companyId}
          activeBranchId={user.activeBranchId}
          branchIds={user.branchIds}
          isPlatformAdmin={user.isPlatformAdmin}
        />
      </Suspense>
    </div>
  )
}

'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { InventorySection } from '@/components/inventory/InventorySection'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { ImportButton } from '@/components/import/ImportButton'
import { cn } from '@/lib/utils'

export default function InventoryPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  const canManage = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">คลังสินค้า</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <ImportButton type="products" />
              <Link href="/inventory/categories/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                <Tag className="mr-1 h-4 w-4" />
                หมวดหมู่
              </Link>
              <Link href="/inventory/add/" className={cn(buttonVariants({ size: 'sm' }))}>
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มสินค้า
              </Link>
            </>
          )}
        </div>
      </div>

      <Suspense fallback={<TableSkeleton columns={8} rows={10} withFilters />}>
        <InventorySection
          role={user.role}
          companyId={user.companyId}
          activeBranchId={user.activeBranchId}
          branchIds={user.branchIds}
          isPlatformAdmin={user.isPlatformAdmin}
          canManage={canManage}
        />
      </Suspense>
    </div>
  )
}

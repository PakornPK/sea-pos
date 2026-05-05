'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/auth-client'
import { SalesListSection } from '@/components/pos/SalesListSection'
import { TableSkeleton } from '@/components/loading/TableSkeleton'

export default function SalesListPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">รายการขาย</h1>
      </div>

      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <SalesListSection
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

'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/auth-client'
import { ReportsSection } from '@/components/reports/ReportsSection'

export default function ReportsPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  return (
    <Suspense>
      <ReportsSection
        role={user.role}
        companyId={user.companyId}
        activeBranchId={user.activeBranchId}
        branchIds={user.branchIds}
        isPlatformAdmin={user.isPlatformAdmin}
      />
    </Suspense>
  )
}

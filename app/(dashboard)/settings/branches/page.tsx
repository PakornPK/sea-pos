'use client'

import { useAuth } from '@/lib/auth-client'
import { BranchesSection } from '@/components/settings/BranchesSection'

export default function BranchesPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">สาขา</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จัดการสาขาของบริษัท รหัสสาขาจะขึ้นต้นเลขใบเสร็จของสาขานั้น ๆ
        </p>
      </div>
      <BranchesSection />
    </div>
  )
}

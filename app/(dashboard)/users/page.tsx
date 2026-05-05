'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/auth-client'
import { UsersSection } from '@/components/users/UsersSection'

export default function UsersPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">จัดการผู้ใช้งาน</h1>
      </div>

      <Suspense>
        <UsersSection currentUserId={user.id} companyId={user.companyId} />
      </Suspense>
    </div>
  )
}

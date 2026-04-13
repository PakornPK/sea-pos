import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { userRepo } from '@/lib/repositories'
import { AddUserForm } from '@/components/users/AddUserForm'
import { UserTable } from '@/components/users/UserTable'

export const metadata: Metadata = {
  title: 'จัดการผู้ใช้งาน | SEA-POS',
}

export default async function UsersPage() {
  const { me } = await requirePageRole(['admin'])
  const admin = createAdminClient()
  const users = await userRepo.listAll(admin)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">จัดการผู้ใช้งาน</h1>
      </div>

      <AddUserForm />

      <UserTable users={users} currentUserId={me.id} />
    </div>
  )
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AddUserForm } from '@/components/users/AddUserForm'
import { UserTable, type UserRow } from '@/components/users/UserTable'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'จัดการผู้ใช้งาน | SEA-POS',
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const admin = createAdminClient()
  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from('profiles').select('id, role, full_name'),
  ])

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  )

  const users: UserRow[] = (authData?.users ?? []).map((u) => {
    const p = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: (p?.full_name as string | null) ?? null,
      role: ((p?.role as UserRole) ?? 'cashier'),
      created_at: u.created_at,
    }
  }).sort((a, b) => a.email.localeCompare(b.email))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">จัดการผู้ใช้งาน</h1>
      </div>

      <AddUserForm />

      <UserTable users={users} currentUserId={user.id} />
    </div>
  )
}

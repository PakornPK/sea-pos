import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { branchRepo, userRepo } from '@/lib/repositories'
import { AddUserForm } from '@/components/users/AddUserForm'
import { UserTable, type UserRow } from '@/components/users/UserTable'

export const metadata: Metadata = {
  title: 'จัดการผู้ใช้งาน | SEA-POS',
}

export default async function UsersPage() {
  const { me } = await requirePageRole(['admin'])

  const [users, branches, assignments] = await Promise.all([
    me.companyId ? userRepo.listByCompany(me.companyId) : Promise.resolve([]),
    branchRepo.list(),
    me.companyId ? branchRepo.listAssignmentsForCompany(me.companyId) : Promise.resolve([]),
  ])

  const branchById = new Map(branches.map((b) => [b.id, b]))

  const rows: UserRow[] = users.map((u) => {
    const mine = assignments.filter((a) => a.user_id === u.id)
    const userBranches = mine
      .map((a) => branchById.get(a.branch_id))
      .filter((b): b is (typeof branches)[number] => !!b)
      .sort((a, b) => {
        const defA = mine.find((m) => m.branch_id === a.id)?.is_default ?? false
        const defB = mine.find((m) => m.branch_id === b.id)?.is_default ?? false
        if (defA !== defB) return defA ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    const defaultBranchId = mine.find((a) => a.is_default)?.branch_id ?? null
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      created_at: u.created_at,
      branches: userBranches,
      default_branch_id: defaultBranchId,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">จัดการผู้ใช้งาน</h1>
      </div>

      <AddUserForm branches={branches} />

      <UserTable users={rows} currentUserId={me.id} allBranches={branches} />
    </div>
  )
}

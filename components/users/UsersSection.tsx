'use client'

import { useState, useEffect } from 'react'
import { userRepo, branchRepo } from '@/lib/repositories'
import { AddUserForm } from '@/components/users/AddUserForm'
import { UserTable, type UserRow } from '@/components/users/UserTable'
import type { Branch } from '@/types/database'

interface Props {
  currentUserId: string
  companyId: string | null
}

export function UsersSection({ currentUserId, companyId }: Props) {
  const [rows, setRows]       = useState<UserRow[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    Promise.all([
      userRepo.listByCompany(companyId),
      branchRepo.list(),
      branchRepo.listAssignmentsForCompany(companyId),
    ])
      .then(([users, brs, assignments]) => {
        setBranches(brs)
        const branchById = new Map(brs.map((b) => [b.id, b]))
        const mapped: UserRow[] = users.map((u) => {
          const mine = assignments.filter((a) => a.user_id === u.id)
          const userBranches = mine
            .map((a) => branchById.get(a.branch_id))
            .filter((b): b is Branch => !!b)
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
            first_name: u.first_name,
            last_name:  u.last_name,
            full_name:  u.full_name,
            role: u.role,
            created_at: u.created_at,
            branches: userBranches,
            default_branch_id: defaultBranchId,
          }
        })
        setRows(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
  }

  return (
    <>
      <AddUserForm branches={branches} onCreated={load} />
      <UserTable users={rows} currentUserId={currentUserId} allBranches={branches} onMutated={load} />
    </>
  )
}

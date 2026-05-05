'use client'

import { useState, useEffect } from 'react'
import { branchRepo } from '@/lib/repositories'
import { BranchRow } from '@/components/settings/BranchRow'
import { AddBranchDialog } from '@/components/settings/AddBranchDialog'
import type { Branch } from '@/types/database'

export function BranchesSection() {
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const reload = () => window.location.reload()

  useEffect(() => {
    branchRepo.list()
      .then(setBranches)
      .catch(() => setBranches([]))
  }, [])

  if (branches === null) {
    return <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
  }

  return (
    <>
      <AddBranchDialog onCreated={reload} />
      <div className="flex flex-col gap-2">
        {branches.length === 0 ? (
          <p className="rounded-2xl bg-muted/30 py-10 text-center text-[14px] text-muted-foreground">
            ยังไม่มีสาขา
          </p>
        ) : (
          branches.map((b) => <BranchRow key={b.id} branch={b} onMutated={reload} />)
        )}
      </div>
    </>
  )
}

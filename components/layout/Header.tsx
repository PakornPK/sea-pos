'use client'

import { Badge } from '@/components/ui/badge'
import { BranchPicker } from '@/components/layout/BranchPicker'
import { ROLE_LABELS } from '@/lib/labels'
import type { Branch, UserRole } from '@/types/database'

type HeaderProps = {
  email:        string
  fullName:     string
  role:         UserRole
  branches:     Branch[]
  activeBranch: Branch | null
}

export function Header({ email, fullName, role, branches, activeBranch }: HeaderProps) {
  return (
    <header className="flex h-14 items-center border-b bg-background px-6">
      <div className="ml-auto flex items-center gap-3">
        {branches.length > 0 && (
          <BranchPicker branches={branches} active={activeBranch} />
        )}
        <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
        <span className="text-sm text-muted-foreground">{fullName || email}</span>
      </div>
    </header>
  )
}

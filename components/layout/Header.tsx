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
    <header className="flex h-[52px] shrink-0 items-center border-b border-border bg-card px-6 gap-3">
      <div className="ml-auto flex items-center gap-2.5">
        {branches.length > 0 && (
          <BranchPicker branches={branches} active={activeBranch} />
        )}
        <Badge
          variant="secondary"
          className="rounded-full text-[11px] font-medium px-2.5"
        >
          {ROLE_LABELS[role]}
        </Badge>
        <span className="text-[13px] text-muted-foreground">
          {fullName.trim() || email}
        </span>
      </div>
    </header>
  )
}

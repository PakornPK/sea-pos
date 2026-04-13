'use client'

import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/labels'
import type { UserRole } from '@/types/database'

type HeaderProps = {
  email: string
  fullName: string
  role: UserRole
}

export function Header({ email, fullName, role }: HeaderProps) {
  return (
    <header className="flex h-14 items-center border-b bg-background px-6">
      <div className="ml-auto flex items-center gap-3">
        <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
        <span className="text-sm text-muted-foreground">{fullName || email}</span>
      </div>
    </header>
  )
}

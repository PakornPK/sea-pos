'use client'

import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/database'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'ผู้ดูแลระบบ',
  manager:    'ผู้จัดการ',
  cashier:    'พนักงานเก็บเงิน',
  purchasing: 'จัดซื้อ',
}

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

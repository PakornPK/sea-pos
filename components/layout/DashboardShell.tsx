import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { UserRole } from '@/types/database'

type DashboardShellProps = {
  children: React.ReactNode
  email: string
  fullName: string
  role: UserRole
}

export function DashboardShell({ children, email, fullName, role }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={email} fullName={fullName} role={role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

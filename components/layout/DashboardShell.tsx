import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { Branch, UserRole } from '@/types/database'

type DashboardShellProps = {
  children: React.ReactNode
  email: string
  fullName: string
  role: UserRole
  isPlatformAdmin: boolean
  branches: Branch[]
  activeBranch: Branch | null
}

export function DashboardShell({
  children, email, fullName, role, isPlatformAdmin, branches, activeBranch,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        isPlatformAdmin={isPlatformAdmin}
        activeBranch={activeBranch}
        fullName={fullName}
        email={email}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          email={email}
          fullName={fullName}
          role={role}
          branches={branches}
          activeBranch={activeBranch}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, branches } = useAuth()
  if (!user) return null

  const activeBranch = branches.find((b) => b.id === user.activeBranchId) ?? null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={user.role}
        isPlatformAdmin={user.isPlatformAdmin}
        activeBranch={activeBranch}
        fullName={user.fullName ?? ''}
        email={user.email ?? ''}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          email={user.email ?? ''}
          fullName={user.fullName ?? ''}
          role={user.role}
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

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

type DashboardShellProps = {
  children: React.ReactNode
  email: string
}

export function DashboardShell({ children, email }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

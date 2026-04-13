import { requirePage } from '@/lib/auth'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { me } = await requirePage()

  return (
    <DashboardShell
      email={me.email ?? ''}
      role={me.role}
      fullName={me.fullName ?? ''}
    >
      {children}
    </DashboardShell>
  )
}

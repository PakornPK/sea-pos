import { redirect } from 'next/navigation'
import { requirePage } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { me } = await requirePage()

  // Status gate: customer-company users whose company is not `active`
  // are diverted to /blocked. Platform admins skip this (companyId = null).
  if (me.companyId && !me.isPlatformAdmin) {
    const company = await companyRepo.getCurrent()
    if (company && company.status !== 'active') {
      redirect('/blocked')
    }
  }

  return (
    <DashboardShell
      email={me.email ?? ''}
      role={me.role}
      fullName={me.fullName ?? ''}
      isPlatformAdmin={me.isPlatformAdmin}
    >
      {children}
    </DashboardShell>
  )
}

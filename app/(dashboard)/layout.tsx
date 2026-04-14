import { redirect } from 'next/navigation'
import { requirePage } from '@/lib/auth'
import { branchRepo, companyRepo } from '@/lib/repositories'
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

  // Branch gate: customer users (not platform admins) must be assigned to
  // at least one branch. A 0-branch user was likely created before the admin
  // finished onboarding — send them to /no-branch (outside this layout).
  if (me.companyId && !me.isPlatformAdmin && me.branchIds.length === 0) {
    redirect('/no-branch')
  }

  // Resolve branches for the header picker.
  const branches = (me.companyId && !me.isPlatformAdmin)
    ? await branchRepo.list()
    : []
  const activeBranch = branches.find((b) => b.id === me.activeBranchId) ?? null

  return (
    <DashboardShell
      email={me.email ?? ''}
      role={me.role}
      fullName={me.fullName ?? ''}
      isPlatformAdmin={me.isPlatformAdmin}
      branches={branches}
      activeBranch={activeBranch}
    >
      {children}
    </DashboardShell>
  )
}

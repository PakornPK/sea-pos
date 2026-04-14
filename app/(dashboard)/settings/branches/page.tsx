import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { branchRepo, planRepo, companyRepo } from '@/lib/repositories'
import { BranchRow } from '@/components/settings/BranchRow'
import { AddBranchDialog } from '@/components/settings/AddBranchDialog'

export const metadata: Metadata = {
  title: 'สาขา | SEA-POS',
}

export default async function BranchesPage() {
  await requirePageRole(['admin'])

  const [branches, company] = await Promise.all([
    branchRepo.list(),
    companyRepo.getCurrent(),
  ])

  const plan = company ? await planRepo.getByCode(company.plan) : null
  const limit = plan?.max_branches ?? null
  const atLimit = limit !== null && branches.length >= limit

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">สาขา</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            จัดการสาขาของบริษัท รหัสสาขาจะขึ้นต้นเลขใบเสร็จของสาขานั้น ๆ
          </p>
        </div>
        {!atLimit && <AddBranchDialog />}
      </div>

      {limit !== null && (
        <p className="text-xs text-muted-foreground">
          ใช้งาน {branches.length} / {limit} สาขา (แพ็กเกจ {plan?.name ?? company?.plan})
        </p>
      )}

      <div className="flex flex-col gap-2">
        {branches.length === 0 ? (
          <p className="rounded-lg border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีสาขา
          </p>
        ) : (
          branches.map((b) => <BranchRow key={b.id} branch={b} />)
        )}
      </div>
    </div>
  )
}

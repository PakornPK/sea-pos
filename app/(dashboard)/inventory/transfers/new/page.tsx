import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { branchRepo, productRepo } from '@/lib/repositories'
import { TransferCreateForm } from '@/components/inventory/TransferCreateForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'สร้างรายการโอน | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager']

export default async function NewTransferPage() {
  const { me } = await requirePageRole(ALLOWED)

  const [allBranches, productsPage, fromBranch] = await Promise.all([
    branchRepo.list(),
    me.activeBranchId
      ? productRepo.listInStockForBranchPaginated(
          { page: 1, pageSize: 500 },
          { branchId: me.activeBranchId },
        )
      : Promise.resolve({ rows: [], totalCount: 0, page: 1, pageSize: 500, totalPages: 1 }),
    me.activeBranchId ? branchRepo.getById(me.activeBranchId) : Promise.resolve(null),
  ])

  const toBranchCandidates = allBranches.filter((b) => b.id !== me.activeBranchId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory/transfers"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">สร้างรายการโอน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ย้ายสินค้าจากสาขาปัจจุบันไปสาขาอื่น
          </p>
        </div>
      </div>

      <TransferCreateForm
        fromBranch={fromBranch}
        toBranchCandidates={toBranchCandidates}
        productsAtSource={productsPage.rows}
      />
    </div>
  )
}

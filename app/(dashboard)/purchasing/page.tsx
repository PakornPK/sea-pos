import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Truck } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { purchaseOrderRepo, branchRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { POList, type POListRow } from '@/components/purchasing/POList'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PurchaseOrderStatus, UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'จัดซื้อ | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

type Search = { page?: string; pageSize?: string; status?: string; branch?: string }

const VALID_STATUSES: PurchaseOrderStatus[] = ['draft', 'ordered', 'received', 'cancelled']

export default async function PurchasingPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  await requirePageRole(ALLOWED)
  const sp = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">ใบสั่งซื้อ</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/purchasing/suppliers"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Truck className="mr-1 h-4 w-4" />
            ผู้จำหน่าย
          </Link>
          <Link
            href="/purchasing/new"
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            <Plus className="mr-1 h-4 w-4" />
            สร้างใบสั่งซื้อ
          </Link>
        </div>
      </div>

      <Suspense
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}-${sp.status ?? 'all'}`}
        fallback={<TableSkeleton columns={8} rows={10} withFilters />}
      >
        <POListContent sp={sp} />
      </Suspense>
    </div>
  )
}

async function POListContent({ sp }: { sp: Search }) {
  const { me } = await requirePageRole(ALLOWED)
  const p = parsePageParams(sp)

  const statusFilter = sp.status && VALID_STATUSES.includes(sp.status as PurchaseOrderStatus)
    ? (sp.status as PurchaseOrderStatus)
    : undefined

  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const activeBranch = me.activeBranchId ? await branchRepo.getById(me.activeBranchId) : null

  const result = await purchaseOrderRepo.listRecentPaginated(p, {
    status:   statusFilter,
    branchId: branchFilter,
  })

  const orders: POListRow[] = result.rows.map((o) => {
    const supplier = Array.isArray(o.supplier) ? o.supplier[0] : o.supplier
    const branch = Array.isArray(o.branch) ? o.branch[0] : o.branch
    return {
      id: o.id,
      po_no: o.po_no,
      supplier_name: supplier?.name ?? '—',
      branch_code: branch?.code ?? null,
      branch_name: branch?.name ?? null,
      status: o.status as PurchaseOrderStatus,
      total_amount: Number(o.total_amount),
      ordered_at: o.ordered_at,
      received_at: o.received_at,
      created_at: o.created_at,
    }
  })

  return (
    <>
      {isAdmin && (
        <BranchScopeToggle
          basePath="/purchasing"
          searchParams={sp}
          isAllBranches={branchFilter === null}
          activeBranchLabel={activeBranch?.name ?? null}
        />
      )}
      <POList orders={orders} currentStatus={statusFilter ?? 'all'} />
      <Pagination
        basePath="/purchasing"
        searchParams={sp}
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
      />
    </>
  )
}

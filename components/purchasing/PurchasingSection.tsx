'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { purchaseOrderRepo, branchRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { POList, type POListRow } from '@/components/purchasing/POList'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import type { PurchaseOrderStatus, UserRole } from '@/types/database'
import type { Paginated } from '@/lib/pagination'

const VALID_STATUSES: PurchaseOrderStatus[] = ['draft', 'ordered', 'received', 'cancelled']

interface Props {
  role: UserRole
  companyId: string | null
  activeBranchId: string | null
  branchIds: string[]
  isPlatformAdmin: boolean
}

export function PurchasingSection({ role, companyId: _companyId, activeBranchId, branchIds, isPlatformAdmin }: Props) {
  const searchParams = useSearchParams()
  const sp = {
    page:       searchParams.get('page')       ?? undefined,
    pageSize:   searchParams.get('pageSize')   ?? undefined,
    status:     searchParams.get('status')     ?? undefined,
    branch:     searchParams.get('branch')     ?? undefined,
  }

  const me = { role, companyId: _companyId, activeBranchId, branchIds, isPlatformAdmin, id: '', email: null, fullName: null }
  const p = parsePageParams(sp)
  const statusFilter = sp.status && VALID_STATUSES.includes(sp.status as PurchaseOrderStatus)
    ? (sp.status as PurchaseOrderStatus)
    : undefined
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAdmin = role === 'admin' || isPlatformAdmin

  type PO = Awaited<ReturnType<typeof purchaseOrderRepo.listRecentPaginated>>
  const [result, setResult] = useState<PO | null>(null)
  const [activeBranch, setActiveBranch] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetches: Promise<void>[] = [
      purchaseOrderRepo.listRecentPaginated(p, { status: statusFilter, branchId: branchFilter })
        .then(setResult),
    ]
    if (activeBranchId) {
      fetches.push(branchRepo.getById(activeBranchId).then((b) => setActiveBranch(b)))
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.page, sp.pageSize, sp.status, sp.branch])

  const orders: POListRow[] = (result?.rows ?? []).map((o) => {
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

  if (loading) return <TableSkeleton columns={8} rows={10} withFilters />

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
      {result && (
        <Pagination
          basePath="/purchasing"
          searchParams={sp}
          page={result.page}
          pageSize={result.pageSize}
          totalCount={result.totalCount}
          totalPages={result.totalPages}
        />
      )}
    </>
  )
}

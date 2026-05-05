'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { productRepo, branchRepo, categoryRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { ProductTable } from '@/components/inventory/ProductTable'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import type { Category, ProductWithStockAndCategory } from '@/types/database'
import type { UserRole } from '@/types/database'
import type { Paginated } from '@/lib/pagination'

interface Props {
  role: UserRole
  companyId: string | null
  activeBranchId: string | null
  branchIds: string[]
  isPlatformAdmin: boolean
  canManage: boolean
}

export function InventorySection({ role, companyId, activeBranchId, branchIds, isPlatformAdmin, canManage }: Props) {
  const searchParams = useSearchParams()
  const sp = {
    page:     searchParams.get('page')     ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    branch:   searchParams.get('branch')   ?? undefined,
  }

  const me = { role, companyId, activeBranchId, branchIds, isPlatformAdmin, id: '', email: null, fullName: null }
  const pageParams = parsePageParams(sp, { pageSize: 10 })
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAdmin = role === 'admin' || isPlatformAdmin
  const isAllBranches = branchFilter === null

  const [result, setResult]       = useState<Paginated<ProductWithStockAndCategory> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeBranch, setActiveBranch] = useState<{ name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    if (!result) setLoading(true)
    const resultFetch = isAllBranches
      ? productRepo.listWithStockByBranchPaginated(pageParams, { categoryId: sp.category || undefined })
      : branchFilter
        ? productRepo.listWithStockForBranchPaginated(pageParams, { branchId: branchFilter, categoryId: sp.category || undefined })
        : Promise.resolve<Paginated<ProductWithStockAndCategory>>({ rows: [], totalCount: 0, page: 1, pageSize: pageParams.pageSize, totalPages: 1 })

    const fetches: Promise<void>[] = [
      resultFetch.then(setResult),
      companyId
        ? categoryRepo.listCached(companyId).then(setCategories)
        : Promise.resolve(),
    ]
    if (activeBranchId) {
      fetches.push(branchRepo.getById(activeBranchId).then((b) => setActiveBranch(b)))
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.page, sp.pageSize, sp.category, sp.branch, refetchKey])

  if (loading) return <TableSkeleton columns={8} rows={10} withFilters />

  return (
    <>
      {isAdmin && (
        <BranchScopeToggle
          basePath="/inventory"
          searchParams={sp}
          isAllBranches={isAllBranches}
          activeBranchLabel={activeBranch?.name ?? null}
        />
      )}
      <ProductTable
        products={result?.rows ?? []}
        categories={categories}
        canAdjust={canManage && !isAllBranches}
        isAllBranches={isAllBranches}
        onStockAdjusted={() => setRefetchKey((k) => k + 1)}
      />
      {result && (
        <Pagination
          basePath="/inventory"
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

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { productRepo, branchRepo, categoryRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { ProductTable } from '@/components/inventory/ProductTable'
import { BranchScopeToggle } from '@/components/layout/BranchScopeToggle'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

type Search = { page?: string; pageSize?: string; category?: string; branch?: string }

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { me } = await requirePageRole(ALLOWED)
  const canManage = me.role === 'admin' || me.role === 'manager'

  const sp = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">คลังสินค้า</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Link
                href="/inventory/categories"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                <Tag className="mr-1 h-4 w-4" />
                หมวดหมู่
              </Link>
              <Link href="/inventory/add" className={cn(buttonVariants({ size: 'sm' }))}>
                <Plus className="mr-1 h-4 w-4" />
                เพิ่มสินค้า
              </Link>
            </>
          )}
        </div>
      </div>

      <Suspense
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}-${sp.category ?? ''}-${sp.branch ?? 'self'}`}
        fallback={<TableSkeleton columns={8} rows={10} withFilters />}
      >
        <InventoryTable sp={sp} canAdjust={canManage} />
      </Suspense>
    </div>
  )
}

async function InventoryTable({ sp, canAdjust }: { sp: Search; canAdjust: boolean }) {
  const { me } = await requirePageRole(ALLOWED)
  const pageParams = parsePageParams(sp, { pageSize: 10 })

  const isAdmin = me.role === 'admin' || me.isPlatformAdmin
  const branchFilter = resolveBranchFilter(me, sp.branch)
  const isAllBranches = branchFilter === null

  // Admin cross-branch view: aggregate stock across every branch.
  // Single-branch view (default): stock = qty at that branch; adjust buttons work.
  const resultPromise = isAllBranches
    ? productRepo.listWithStockByBranchPaginated(pageParams, {
        categoryId: sp.category || undefined,
      })
    : branchFilter
      ? productRepo.listWithStockForBranchPaginated(pageParams, {
          branchId:   branchFilter,
          categoryId: sp.category || undefined,
        })
      : Promise.resolve({ rows: [], totalCount: 0, page: 1, pageSize: pageParams.pageSize, totalPages: 1 })

  const [result, categories, activeBranch] = await Promise.all([
    resultPromise,
    me.companyId ? categoryRepo.listCached(me.companyId) : Promise.resolve([]),
    me.activeBranchId ? branchRepo.getById(me.activeBranchId) : Promise.resolve(null),
  ])

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
        products={result.rows}
        categories={categories}
        canAdjust={canAdjust && !isAllBranches}
        isAllBranches={isAllBranches}
      />
      <Pagination
        basePath="/inventory"
        searchParams={sp}
        page={result.page}
        pageSize={result.pageSize}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
      />
    </>
  )
}

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { productRepo, categoryRepo } from '@/lib/repositories'
import { parsePageParams } from '@/lib/pagination'
import { ProductTable } from '@/components/inventory/ProductTable'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

type Search = { page?: string; pageSize?: string; category?: string }

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
        key={`${sp.page ?? 1}-${sp.pageSize ?? 20}-${sp.category ?? ''}`}
        fallback={<TableSkeleton columns={8} rows={10} withFilters />}
      >
        <InventoryTable sp={sp} canAdjust={canManage} />
      </Suspense>
    </div>
  )
}

async function InventoryTable({ sp, canAdjust }: { sp: Search; canAdjust: boolean }) {
  await requirePageRole(ALLOWED)
  const pageParams = parsePageParams(sp, { pageSize: 10 })

  const [result, categories] = await Promise.all([
    productRepo.listWithCategoryPaginated(pageParams, {
      categoryId: sp.category || undefined,
    }),
    categoryRepo.list(),
  ])

  return (
    <>
      <ProductTable products={result.rows} categories={categories} canAdjust={canAdjust} />
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

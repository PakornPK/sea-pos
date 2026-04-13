import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { productRepo, categoryRepo } from '@/lib/repositories'
import { ProductTable } from '@/components/inventory/ProductTable'
import { TableSkeleton } from '@/components/loading/TableSkeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

export default async function InventoryPage() {
  // Role check renders instantly thanks to cached loadUser.
  const { me } = await requirePageRole(ALLOWED)
  const canManage = me.role === 'admin' || me.role === 'manager'

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

      <Suspense fallback={<TableSkeleton columns={8} rows={10} withFilters />}>
        <InventoryTable canAdjust={canManage} />
      </Suspense>
    </div>
  )
}

// Streamed server component — the DB fetch happens here, the page shell
// above renders instantly while this is pending.
async function InventoryTable({ canAdjust }: { canAdjust: boolean }) {
  const { supabase } = await requirePageRole(ALLOWED)
  const [products, categories] = await Promise.all([
    productRepo.listWithCategory(supabase),
    categoryRepo.list(supabase),
  ])
  return <ProductTable products={products} categories={categories} canAdjust={canAdjust} />
}

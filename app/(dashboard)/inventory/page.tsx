import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { ProductTable } from '@/components/inventory/ProductTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category, ProductWithCategory } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

export default async function InventoryPage() {
  const { supabase, me } = await requirePageRole(['admin', 'manager', 'purchasing'])

  const [{ data: productData }, { data: categoryData }] = await Promise.all([
    supabase.from('products').select('*, category:categories(id, name)').order('name'),
    supabase.from('categories').select('*').order('name'),
  ])

  const products = (productData ?? []) as ProductWithCategory[]
  const categories = (categoryData ?? []) as Category[]
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
      <ProductTable products={products} categories={categories} canAdjust={canManage} />
    </div>
  )
}

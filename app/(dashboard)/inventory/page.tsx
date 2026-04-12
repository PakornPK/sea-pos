import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductTable } from '@/components/inventory/ProductTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category, ProductWithCategory, UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

export default async function InventoryPage() {
  const supabase = await createClient()

  const [{ data: productData }, { data: categoryData }, { data: { user } }] = await Promise.all([
    supabase
      .from('products')
      .select('*, category:categories(id, name)')
      .order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.auth.getUser(),
  ])

  const products = (productData ?? []) as ProductWithCategory[]
  const categories = (categoryData ?? []) as Category[]

  let userRole: UserRole = 'cashier'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    userRole = (profile?.role ?? 'cashier') as UserRole
  }

  const canManage = ['admin', 'manager'].includes(userRole)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">คลังสินค้า</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href="/inventory/categories"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Tag className="mr-1 h-4 w-4" />
              หมวดหมู่
            </Link>
          )}
          {canManage && (
            <Link href="/inventory/add" className={cn(buttonVariants({ size: 'sm' }))}>
              <Plus className="mr-1 h-4 w-4" />
              เพิ่มสินค้า
            </Link>
          )}
        </div>
      </div>
      <ProductTable products={products} categories={categories} />
    </div>
  )
}

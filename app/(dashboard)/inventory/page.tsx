import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductTable } from '@/components/inventory/ProductTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/database'

export const metadata: Metadata = {
  title: 'คลังสินค้า | SEA-POS',
}

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .order('name')

  const products = (data ?? []) as Product[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">คลังสินค้า</h1>
        <Link href="/inventory/add" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มสินค้า
        </Link>
      </div>
      <ProductTable products={products} />
    </div>
  )
}

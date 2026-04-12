import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { POSTerminal } from '@/components/pos/POSTerminal'
import type { Product } from '@/types/database'

export const metadata: Metadata = {
  title: 'ขายสินค้า | SEA-POS',
}

export default async function POSPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .gt('stock', 0)
    .order('name')

  const products = (data ?? []) as Product[]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold shrink-0">ขายสินค้า</h1>
      <POSTerminal products={products} />
    </div>
  )
}

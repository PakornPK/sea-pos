import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { POSTerminal } from '@/components/pos/POSTerminal'
import type { Category, Product } from '@/types/database'
import type { PickerCustomer } from '@/components/customers/CustomerPicker'

export const metadata: Metadata = {
  title: 'ขายสินค้า | SEA-POS',
}

export default async function POSPage() {
  const { supabase } = await requirePageRole(['admin', 'manager', 'cashier'])

  const [{ data: productData }, { data: categoryData }, { data: customerData }] =
    await Promise.all([
      supabase.from('products').select('*').gt('stock', 0).order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('customers').select('id, name, phone').order('name'),
    ])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold shrink-0">ขายสินค้า</h1>
      <POSTerminal
        products={(productData ?? []) as Product[]}
        categories={(categoryData ?? []) as Category[]}
        customers={(customerData ?? []) as PickerCustomer[]}
      />
    </div>
  )
}

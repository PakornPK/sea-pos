import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { productRepo, categoryRepo, customerRepo } from '@/lib/repositories'
import { POSTerminal } from '@/components/pos/POSTerminal'

export const metadata: Metadata = {
  title: 'ขายสินค้า | SEA-POS',
}

export default async function POSPage() {
  await requirePageRole(['admin', 'manager', 'cashier'])

  const [products, categories, customers] = await Promise.all([
    productRepo.listInStock(),
    categoryRepo.list(),
    customerRepo.listForPicker(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold shrink-0">ขายสินค้า</h1>
      <POSTerminal products={products} categories={categories} customers={customers} />
    </div>
  )
}

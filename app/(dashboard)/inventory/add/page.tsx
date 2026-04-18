import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { categoryRepo, productRepo } from '@/lib/repositories'
import { AddProductForm } from '@/components/inventory/AddProductForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'เพิ่มสินค้า | SEA-POS',
}

export default async function AddProductPage() {
  await requirePageRole(['admin', 'manager'])
  const [categories, allProducts] = await Promise.all([
    categoryRepo.list(),
    productRepo.listAll(),
  ])

  const optionCatIds = new Set(
    categories.filter((c) => c.category_type === 'option' || c.category_type === 'both').map((c) => c.id)
  )
  const linkableProducts = allProducts.filter(
    (p) => !p.category_id || optionCatIds.has(p.category_id)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">เพิ่มสินค้า</h1>
      </div>
      <AddProductForm categories={categories} allProducts={allProducts} linkableProducts={linkableProducts} />
    </div>
  )
}

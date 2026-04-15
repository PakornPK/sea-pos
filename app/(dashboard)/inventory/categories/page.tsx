import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { categoryRepo } from '@/lib/repositories'
import { AddCategoryForm } from '@/components/inventory/AddCategoryForm'
import { CategoryRow } from '@/components/inventory/CategoryRow'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'จัดการหมวดหมู่ | SEA-POS',
}

export default async function CategoriesPage() {
  await requirePageRole(['admin', 'manager'])
  const categories = await categoryRepo.list()

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">จัดการหมวดหมู่</h1>
      </div>

      <AddCategoryForm />

      <div className="flex flex-col gap-2">
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">ยังไม่มีหมวดหมู่</p>
        ) : (
          categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              id={cat.id}
              name={cat.name}
              prefix={cat.sku_prefix}
              vatExempt={cat.vat_exempt}
            />
          ))
        )}
      </div>
    </div>
  )
}

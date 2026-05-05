'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import { categoryRepo } from '@/lib/repositories'
import { AddCategoryForm } from '@/components/inventory/AddCategoryForm'
import { CategoryRow } from '@/components/inventory/CategoryRow'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

export default function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    categoryRepo.list()
      .then((d) => { setCategories(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user || loading) return null

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
              categoryType={cat.category_type}
            />
          ))
        )}
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { categoryRepo } from '@/lib/repositories'
import { AddProductForm } from '@/components/inventory/AddProductForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'เพิ่มสินค้า | SEA-POS',
}

export default async function AddProductPage() {
  const { supabase } = await requirePageRole(['admin', 'manager'])
  const categories = await categoryRepo.list(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">เพิ่มสินค้า</h1>
      </div>
      <AddProductForm categories={categories} />
    </div>
  )
}

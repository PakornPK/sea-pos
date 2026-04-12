import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AddProductForm } from '@/components/inventory/AddProductForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

export const metadata: Metadata = {
  title: 'เพิ่มสินค้า | SEA-POS',
}

export default async function AddProductPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  const categories = (data ?? []) as Category[]

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

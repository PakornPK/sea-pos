import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { POForm } from '@/components/purchasing/POForm'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Category, Product, Supplier } from '@/types/database'

export const metadata: Metadata = {
  title: 'สร้างใบสั่งซื้อ | SEA-POS',
}

export default async function NewPOPage() {
  const { supabase } = await requirePageRole(['admin', 'manager', 'purchasing'])

  const [{ data: suppliers }, { data: products }, { data: categories }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*').order('name'),
    supabase.from('categories').select('*').order('name'),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchasing"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">สร้างใบสั่งซื้อ</h1>
      </div>

      {(suppliers ?? []).length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            ยังไม่มีผู้จำหน่ายในระบบ{' '}
            <Link href="/purchasing/suppliers" className="text-primary underline">
              เพิ่มผู้จำหน่ายก่อน
            </Link>
          </p>
        </div>
      ) : (
        <POForm
          suppliers={(suppliers ?? []) as Supplier[]}
          products={(products ?? []) as Product[]}
          categories={(categories ?? []) as Category[]}
        />
      )}
    </div>
  )
}

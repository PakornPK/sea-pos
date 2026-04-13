import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { supplierRepo } from '@/lib/repositories'
import { SupplierTable } from '@/components/purchasing/SupplierTable'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'ผู้จำหน่าย | SEA-POS',
}

export default async function SuppliersPage() {
  const { supabase, me } = await requirePageRole(['admin', 'manager', 'purchasing'])
  const suppliers = await supplierRepo.list(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/purchasing"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold">ผู้จำหน่าย</h1>
      </div>
      <SupplierTable suppliers={suppliers} role={me.role} />
    </div>
  )
}

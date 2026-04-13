import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Truck } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { purchaseOrderRepo } from '@/lib/repositories'
import { POList, type POListRow } from '@/components/purchasing/POList'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PurchaseOrderStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'จัดซื้อ | SEA-POS',
}

export default async function PurchasingPage() {
  const { supabase } = await requirePageRole(['admin', 'manager', 'purchasing'])

  const raw = await purchaseOrderRepo.listRecent(supabase)

  const orders: POListRow[] = raw.map((o) => {
    const supplier = Array.isArray(o.supplier) ? o.supplier[0] : o.supplier
    return {
      id: o.id,
      po_no: o.po_no,
      supplier_name: supplier?.name ?? '—',
      status: o.status as PurchaseOrderStatus,
      total_amount: Number(o.total_amount),
      ordered_at: o.ordered_at,
      received_at: o.received_at,
      created_at: o.created_at,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ใบสั่งซื้อ</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/purchasing/suppliers"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Truck className="mr-1 h-4 w-4" />
            ผู้จำหน่าย
          </Link>
          <Link
            href="/purchasing/new"
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            <Plus className="mr-1 h-4 w-4" />
            สร้างใบสั่งซื้อ
          </Link>
        </div>
      </div>
      <POList orders={orders} />
    </div>
  )
}

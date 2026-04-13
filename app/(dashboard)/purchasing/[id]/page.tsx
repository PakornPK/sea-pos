import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import {
  purchaseOrderRepo, supplierRepo, productRepo, categoryRepo,
} from '@/lib/repositories'
import { POForm } from '@/components/purchasing/POForm'
import { POActions } from '@/components/purchasing/POActions'
import { ReceiveForm, type ReceiveLine } from '@/components/purchasing/ReceiveForm'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPoNo, formatDateTime, formatBaht } from '@/lib/format'
import { PO_STATUS_LABEL, PO_STATUS_VARIANT } from '@/lib/labels'
import type { PurchaseOrderStatus } from '@/types/database'

export const metadata: Metadata = {
  title: 'ใบสั่งซื้อ | SEA-POS',
}

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requirePageRole(['admin', 'manager', 'purchasing'])

  const [po, items, suppliers, products, categories] = await Promise.all([
    purchaseOrderRepo.getById(supabase, id),
    purchaseOrderRepo.listItemsWithProduct(supabase, id),
    supplierRepo.list(supabase),
    productRepo.listAll(supabase),
    categoryRepo.list(supabase),
  ])

  if (!po) notFound()
  const supplier = suppliers.find((s) => s.id === po.supplier_id)

  const isDraft    = po.status === 'draft'
  const isOrdered  = po.status === 'ordered'

  // Initial lines for edit form
  const initialLines = items.map((i) => ({
    productId: i.product_id,
    quantity:  i.quantity_ordered,
    unitCost:  Number(i.unit_cost),
  }))

  // Receive lines
  const receiveLines: ReceiveLine[] = items.map((i) => {
    const prod = Array.isArray(i.product) ? i.product[0] : i.product
    return {
      itemId:      i.id,
      productName: prod?.name ?? '—',
      productSku:  prod?.sku ?? null,
      ordered:     i.quantity_ordered,
      received:    i.quantity_received,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/purchasing"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold font-mono">
                {formatPoNo(po.po_no)}
              </h1>
              <Badge variant={PO_STATUS_VARIANT[po.status as PurchaseOrderStatus]}>
                {PO_STATUS_LABEL[po.status as PurchaseOrderStatus]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              สร้างเมื่อ {formatDateTime(po.created_at)}
            </p>
          </div>
        </div>
        <POActions id={po.id} status={po.status} />
      </div>

      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">ผู้จำหน่าย</p>
          <p className="font-medium mt-1">{supplier?.name ?? '—'}</p>
          {supplier?.contact_name && (
            <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">สั่งซื้อเมื่อ</p>
          <p className="font-medium mt-1">{formatDateTime(po.ordered_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">รับของเมื่อ</p>
          <p className="font-medium mt-1">{formatDateTime(po.received_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ยอดรวม</p>
          <p className="text-xl font-bold tabular-nums mt-1">
            {formatBaht(po.total_amount)}
          </p>
        </div>
      </div>

      {po.notes && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">หมายเหตุ:</span> {po.notes}
        </div>
      )}

      {/* Body: edit form for drafts, read-only lines for other statuses */}
      {isDraft ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">แก้ไขใบสั่งซื้อ</h2>
          <POForm
            suppliers={suppliers}
            products={products}
            categories={categories}
            initial={{
              id: po.id,
              supplierId: po.supplier_id,
              notes: po.notes,
              lines: initialLines,
            }}
          />
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-3">รายการสินค้า</h2>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">สินค้า</th>
                  <th className="px-3 py-2 font-medium text-right w-24">สั่ง</th>
                  <th className="px-3 py-2 font-medium text-right w-24">รับแล้ว</th>
                  <th className="px-3 py-2 font-medium text-right w-32">ราคาทุน</th>
                  <th className="px-3 py-2 font-medium text-right w-32">รวม</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const prod = Array.isArray(i.product) ? i.product[0] : i.product
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{prod?.name ?? '—'}</div>
                        {prod?.sku && (
                          <div className="text-xs text-muted-foreground">{prod.sku}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{i.quantity_ordered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {i.quantity_received}
                        {i.quantity_received < i.quantity_ordered && (
                          <span className="text-destructive ml-1">
                            (-{i.quantity_ordered - i.quantity_received})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatBaht(i.unit_cost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatBaht(i.quantity_ordered * Number(i.unit_cost))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive UI: only when status = ordered */}
      {isOrdered && (
        <div>
          <h2 className="text-lg font-semibold mb-3">รับของ</h2>
          <ReceiveForm id={po.id} lines={receiveLines} />
        </div>
      )}
    </div>
  )
}

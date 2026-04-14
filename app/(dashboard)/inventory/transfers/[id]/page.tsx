import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { requirePageRole } from '@/lib/auth'
import { stockTransferRepo } from '@/lib/repositories'
import { TransferActions } from '@/components/inventory/TransferActions'
import { TransferReceiveForm } from '@/components/inventory/TransferReceiveForm'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type { StockTransferStatus, UserRole } from '@/types/database'

export const metadata: Metadata = {
  title: 'รายการโอน | SEA-POS',
}

const ALLOWED: UserRole[] = ['admin', 'manager', 'purchasing']

const STATUS_LABEL: Record<StockTransferStatus, string> = {
  draft:      'ร่าง',
  in_transit: 'กำลังโอน',
  received:   'รับของแล้ว',
  cancelled:  'ยกเลิก',
}
const STATUS_VARIANT: Record<StockTransferStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft:      'outline',
  in_transit: 'default',
  received:   'secondary',
  cancelled:  'destructive',
}

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { me } = await requirePageRole(ALLOWED)

  const transfer = await stockTransferRepo.getById(id)
  if (!transfer) notFound()

  // Receive: manager/admin at the destination branch.
  const isManageRole = me.role === 'admin' || me.role === 'manager'
  const canReceive = isManageRole
    && transfer.status === 'in_transit'
    && (me.isPlatformAdmin || me.role === 'admin' || me.branchIds.includes(transfer.to_branch.id))

  // Cancel: any manager with access to source branch, while not yet received.
  const canCancel = isManageRole
    && (transfer.status === 'in_transit' || transfer.status === 'draft')
    && (me.isPlatformAdmin || me.role === 'admin' || me.branchIds.includes(transfer.from_branch.id))

  const totalSent     = transfer.items.reduce((s, it) => s + it.quantity_sent, 0)
  const totalReceived = transfer.items.reduce((s, it) => s + it.quantity_received, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/transfers"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">รายการโอนสต๊อก</h1>
              <Badge variant={STATUS_VARIANT[transfer.status]}>
                {STATUS_LABEL[transfer.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              สร้างเมื่อ {formatDateTime(transfer.created_at)}
              {transfer.received_at && <> · รับของเมื่อ {formatDateTime(transfer.received_at)}</>}
            </p>
          </div>
        </div>
        <TransferActions
          transferId={transfer.id}
          status={transfer.status}
          canCancel={canCancel}
        />
      </div>

      {/* Route summary */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">สาขาต้นทาง</p>
          <p className="mt-1 font-medium">
            {transfer.from_branch.name}
            <span className="ml-1 text-xs text-muted-foreground">({transfer.from_branch.code})</span>
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">สาขาปลายทาง</p>
          <p className="mt-1 font-medium">
            {transfer.to_branch.name}
            <span className="ml-1 text-xs text-muted-foreground">({transfer.to_branch.code})</span>
          </p>
        </div>
      </div>

      {transfer.notes && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-xs text-muted-foreground">หมายเหตุ: </span>
          {transfer.notes}
        </div>
      )}

      {canReceive && (
        <TransferReceiveForm transferId={transfer.id} items={transfer.items} />
      )}

      {/* Items */}
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>สินค้า</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">ส่ง</TableHead>
              <TableHead className="text-right">รับแล้ว</TableHead>
              <TableHead>หมายเหตุการรับ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfer.items.map((item) => {
              const shortage = item.quantity_sent - item.quantity_received
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.product.sku ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity_sent}</TableCell>
                  <TableCell className={`text-right tabular-nums ${shortage > 0 ? 'text-destructive font-medium' : ''}`}>
                    {item.quantity_received}
                    {shortage > 0 && transfer.status === 'received' && (
                      <span className="ml-1 text-xs text-muted-foreground">(ขาด {shortage})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.receive_note ?? <span className="text-xs">—</span>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <tfoot className="border-t bg-muted/30 text-sm">
            <tr>
              <td colSpan={2} className="px-4 py-2 text-right font-medium">รวม</td>
              <td className="px-4 py-2 text-right tabular-nums font-semibold">{totalSent}</td>
              <td className="px-4 py-2 text-right tabular-nums font-semibold">{totalReceived}</td>
              <td />
            </tr>
          </tfoot>
        </Table>
      </div>
    </div>
  )
}

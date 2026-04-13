'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPoNo, formatDate, formatBaht } from '@/lib/format'
import { PO_STATUS_LABEL, PO_STATUS_VARIANT } from '@/lib/labels'
import type { PurchaseOrderStatus } from '@/types/database'

export type POListRow = {
  id: string
  po_no: number
  supplier_name: string
  status: PurchaseOrderStatus
  total_amount: number
  ordered_at: string | null
  received_at: string | null
  created_at: string
}

const FILTERS: Array<'all' | PurchaseOrderStatus> = [
  'all', 'draft', 'ordered', 'received', 'cancelled',
]

const FILTER_LABEL: Record<string, string> = {
  all: 'ทั้งหมด', ...PO_STATUS_LABEL,
}

export function POList({ orders }: { orders: POListRow[] }) {
  const [filter, setFilter] = useState<'all' | PurchaseOrderStatus>('all')

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const count = f === 'all' ? orders.length : orders.filter((o) => o.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              {FILTER_LABEL[f]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่มีใบสั่งซื้อ
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่ PO</TableHead>
              <TableHead>ผู้จำหน่าย</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead>สั่งซื้อเมื่อ</TableHead>
              <TableHead>รับของเมื่อ</TableHead>
              <TableHead className="text-right">ยอดรวม</TableHead>
              <TableHead className="text-center">สถานะ</TableHead>
              <TableHead className="text-center">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono font-medium">
                  {formatPoNo(o.po_no)}
                </TableCell>
                <TableCell>{o.supplier_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(o.created_at)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(o.ordered_at)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(o.received_at)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBaht(o.total_amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={PO_STATUS_VARIANT[o.status]}>
                    {PO_STATUS_LABEL[o.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    href={`/purchasing/${o.id}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

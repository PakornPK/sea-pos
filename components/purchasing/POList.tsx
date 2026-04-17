'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, MapPin } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { SortableHeader } from '@/components/ui/SortableHeader'
import { sortRows, type SortDir } from '@/lib/sort'
import { cn } from '@/lib/utils'
import { formatPoNo, formatDate, formatBaht } from '@/lib/format'
import { PO_STATUS_LABEL, PO_STATUS_VARIANT } from '@/lib/labels'
import type { PurchaseOrderStatus } from '@/types/database'

export type POListRow = {
  id: string
  po_no: number
  supplier_name: string
  branch_code: string | null
  branch_name: string | null
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

type SortCol = 'po_no' | 'supplier_name' | 'created_at' | 'total_amount' | 'status'

type Props = {
  orders: POListRow[]
  currentStatus: 'all' | PurchaseOrderStatus
}

export function POList({ orders, currentStatus }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = sortRows(orders, sortCol as keyof POListRow, sortDir)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const href = f === 'all'
            ? '/purchasing'
            : `/purchasing?status=${f}`
          return (
            <Link
              key={f}
              href={href}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                currentStatus === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              {FILTER_LABEL[f]}
            </Link>
          )
        })}
      </div>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่มีใบสั่งซื้อ
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader label="เลขที่ PO" active={sortCol === 'po_no'} dir={sortDir} onClick={() => toggleSort('po_no')} />
              </TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>
                <SortableHeader label="ผู้จำหน่าย" active={sortCol === 'supplier_name'} dir={sortDir} onClick={() => toggleSort('supplier_name')} />
              </TableHead>
              <TableHead>
                <SortableHeader label="วันที่สร้าง" active={sortCol === 'created_at'} dir={sortDir} onClick={() => toggleSort('created_at')} />
              </TableHead>
              <TableHead>สั่งซื้อเมื่อ</TableHead>
              <TableHead>รับของเมื่อ</TableHead>
              <TableHead className="text-right">
                <SortableHeader label="ยอดรวม" active={sortCol === 'total_amount'} dir={sortDir} onClick={() => toggleSort('total_amount')} />
              </TableHead>
              <TableHead className="text-center">
                <SortableHeader label="สถานะ" active={sortCol === 'status'} dir={sortDir} onClick={() => toggleSort('status')} />
              </TableHead>
              <TableHead className="text-center">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono font-medium">
                  {formatPoNo(o.po_no)}
                </TableCell>
                <TableCell>
                  {o.branch_code ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                      title={o.branch_name ?? undefined}
                    >
                      <MapPin className="h-2.5 w-2.5" />
                      {o.branch_code}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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

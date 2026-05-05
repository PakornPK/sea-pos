'use client'

import { useStockMovements } from '@/hooks/use-reports'
import { ExportButton } from '@/components/reports/ExportButton'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Props {
  start: string
  end: string
  startDate: string
  endDate: string
  branchId: string | null
}

export function StockMovementSection({ start, end, startDate, endDate, branchId }: Props) {
  const { data: rows, loading, error } = useStockMovements(start, end, branchId)

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">การเคลื่อนไหวสต๊อก</h3>
        <div className="flex items-center gap-2">
          {!loading && rows && <p className="text-xs text-muted-foreground">{rows.length} รายการ</p>}
          <ExportButton kind="stock-movements" start={startDate} end={endDate} branchId={branchId} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </div>
      ) : error || !rows ? (
        <p className="py-8 text-center text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีการเคลื่อนไหว</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันเวลา</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead>เหตุผล</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-sm">{r.product_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.change > 0 ? 'secondary' : 'destructive'} className="tabular-nums">
                      {r.change > 0 ? `+${r.change}` : r.change}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {r.reason ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

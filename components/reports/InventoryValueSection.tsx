'use client'

import { useInventoryValue } from '@/hooks/use-reports'
import { ExportButton } from '@/components/reports/ExportButton'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBaht } from '@/lib/format'
import { sumBy } from '@/lib/money'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Props { branchId: string | null }

export function InventoryValueSection({ branchId }: Props) {
  const { data: rows, loading, error } = useInventoryValue(branchId)

  const grandTotal = rows ? sumBy(rows, (r) => r.stock_value) : 0

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">มูลค่าสต๊อกตามหมวดหมู่</h3>
        <div className="flex items-center gap-2">
          {!loading && <p className="text-xs text-muted-foreground">รวม {formatBaht(grandTotal)}</p>}
          <ExportButton kind="inventory" branchId={branchId} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </div>
      ) : error || !rows ? (
        <p className="py-8 text-center text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีสินค้า</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>หมวดหมู่</TableHead>
              <TableHead className="text-right">จำนวนรายการ</TableHead>
              <TableHead className="text-right">มูลค่า (ราคาทุน)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.category_id ?? '__uncat__'}>
                <TableCell>{r.category_name}</TableCell>
                <TableCell className="text-right tabular-nums">{r.item_count}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBaht(r.stock_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

'use client'

import { useTopProductsRange } from '@/hooks/use-reports'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBaht } from '@/lib/format'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Props { days: number; branchId: string | null }

export function TopProductsSection({ days, branchId }: Props) {
  const { data: rows, loading, error } = useTopProductsRange(days, branchId)

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5">
      <h3 className="font-semibold text-sm mb-3">สินค้าขายดี (ตามช่วงวันที่เลือก)</h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </div>
      ) : error || !rows ? (
        <p className="py-8 text-center text-sm text-destructive">{error ?? 'โหลดไม่สำเร็จ'}</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>สินค้า</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">รายได้</TableHead>
              <TableHead className="text-right">ต้นทุน (COGS)</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const marginColor = r.margin_pct > 0 ? 'text-emerald-600' : r.margin_pct < 0 ? 'text-red-600' : ''
              return (
                <TableRow key={r.product_id}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.name}</p>
                    {r.sku && <p className="text-xs text-muted-foreground">{r.sku}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantity.toLocaleString('th-TH')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBaht(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBaht(r.cogs)}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${marginColor}`}>
                    {r.margin_pct.toFixed(1)}%
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

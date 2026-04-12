'use client'

import type { Product } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StockAdjustButton } from '@/components/inventory/StockAdjustButton'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

type ProductTableProps = {
  products: Product[]
}

export function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground">
        <p>ยังไม่มีสินค้าในระบบ</p>
        <Link href="/inventory/add" className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มสินค้า
        </Link>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ชื่อสินค้า</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">คงเหลือ</TableHead>
          <TableHead className="text-right">ขั้นต่ำ</TableHead>
          <TableHead className="text-center">สถานะ</TableHead>
          <TableHead className="text-center">ปรับสต๊อก</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLowStock = product.stock <= product.min_stock
          return (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">{product.sku || '—'}</TableCell>
              <TableCell className="text-right">{product.stock}</TableCell>
              <TableCell className="text-right">{product.min_stock}</TableCell>
              <TableCell className="text-center">
                {isLowStock ? (
                  <Badge variant="destructive">ใกล้หมด</Badge>
                ) : (
                  <Badge variant="secondary">ปกติ</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-2">
                  <StockAdjustButton productId={product.id} delta={-1} disabled={product.stock <= 0} />
                  <span className="w-8 text-center tabular-nums">{product.stock}</span>
                  <StockAdjustButton productId={product.id} delta={1} />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

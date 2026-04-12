'use client'

import type { Category, ProductWithCategory } from '@/types/database'
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
import { Plus, Filter } from 'lucide-react'
import { useState } from 'react'

type ProductTableProps = {
  products: ProductWithCategory[]
  categories: Category[]
}

export function ProductTable({ products, categories }: ProductTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filtered = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

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
    <div className="flex flex-col gap-3">
      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedCategory === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
          >
            ทั้งหมด ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  selectedCategory === cat.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อสินค้า</TableHead>
            <TableHead>หมวดหมู่</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">ราคาขาย</TableHead>
            <TableHead className="text-right">คงเหลือ</TableHead>
            <TableHead className="text-right">ขั้นต่ำ</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            <TableHead className="text-center">ปรับสต๊อก</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((product) => {
            const isLowStock = product.stock <= product.min_stock
            const cat = typeof product.category === 'object' && product.category
              ? product.category as { id: string; name: string }
              : null
            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  {cat ? (
                    <Badge variant="outline" className="text-xs">{cat.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{product.sku || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ฿{Number(product.price).toFixed(2)}
                </TableCell>
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
    </div>
  )
}

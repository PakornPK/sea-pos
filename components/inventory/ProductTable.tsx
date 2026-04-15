'use client'

import type { Category, ProductWithStockAndCategory } from '@/types/database'
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
import { ProductThumb } from '@/components/inventory/ProductThumb'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBaht } from '@/lib/format'
import { Plus, Filter, MapPin, Pencil } from 'lucide-react'
import { useState } from 'react'

type ProductTableProps = {
  products: ProductWithStockAndCategory[]
  categories: Category[]
  canAdjust?: boolean
  /** Admin "ทุกสาขา" mode — renders a per-branch stock breakdown instead of +/- buttons. */
  isAllBranches?: boolean
}

export function ProductTable({ products, categories, canAdjust = false, isAllBranches = false }: ProductTableProps) {
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
          <Filter className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
              selectedCategory === null
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                  'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
            <TableHead className="w-14">รูป</TableHead>
            <TableHead>ชื่อสินค้า</TableHead>
            <TableHead>หมวดหมู่</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">ราคาขาย</TableHead>
            <TableHead className="text-right">คงเหลือ</TableHead>
            <TableHead className="text-right">ขั้นต่ำ</TableHead>
            <TableHead className="text-center">สถานะ</TableHead>
            {canAdjust && <TableHead className="text-center">ปรับสต๊อก</TableHead>}
            {canAdjust && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((product) => {
            const isLowStock = product.track_stock && product.stock <= product.min_stock
            const cat = typeof product.category === 'object' && product.category
              ? product.category as { id: string; name: string }
              : null
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <ProductThumb
                    productId={product.id}
                    imageUrl={product.image_url}
                    productName={product.name}
                    canEdit={canAdjust}
                    size={40}
                  />
                </TableCell>
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
                  {formatBaht(product.price)}
                </TableCell>
                <TableCell className="text-right">
                  {!product.track_stock ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : isAllBranches && product.stock_by_branch ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="tabular-nums font-semibold">
                        รวม {product.stock}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {product.stock_by_branch.map((b) => (
                          <span
                            key={b.branch_id}
                            title={b.branch_name}
                            className={cn(
                              'inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums',
                              b.quantity === 0 && 'opacity-50',
                            )}
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            {b.branch_code}: {b.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="tabular-nums">{product.stock}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {product.track_stock ? product.min_stock : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  {!product.track_stock ? (
                    <Badge variant="outline">ไม่ติดตาม</Badge>
                  ) : isLowStock ? (
                    <Badge variant="warning">ใกล้หมด</Badge>
                  ) : (
                    <Badge variant="success">ปกติ</Badge>
                  )}
                </TableCell>
                {canAdjust && (
                  <TableCell>
                    {product.track_stock ? (
                      <div className="flex items-center justify-center gap-2">
                        <StockAdjustButton productId={product.id} delta={-1} disabled={product.stock <= 0} />
                        <span className="w-8 text-center tabular-nums">{product.stock}</span>
                        <StockAdjustButton productId={product.id} delta={1} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs text-center block">—</span>
                    )}
                  </TableCell>
                )}
                {canAdjust && (
                  <TableCell>
                    <Link
                      href={`/inventory/${product.id}/edit`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
                      title="แก้ไขสินค้า"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

'use client'

import Image from 'next/image'
import { ImageOff, Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatBaht } from '@/lib/format'
import type { Product, Category } from '@/types/database'

type Props = {
  product: Product | null
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (product: Product) => void
  inCartQty: number
}

export function ProductDetailDialog({
  product, category, open, onOpenChange, onAddToCart, inCartQty,
}: Props) {
  if (!product) return null

  const lowStock = product.stock <= product.min_stock
  const outOfStock = product.stock === 0
  const remaining = product.stock - inCartQty

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {category?.name ?? 'ไม่ระบุหมวดหมู่'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain"
              sizes="400px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <ImageOff className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <Row label="SKU" value={product.sku || '—'} mono />
          <Row label="ราคาขาย" value={formatBaht(product.price)} bold />
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">สต๊อกคงเหลือ</span>
            <Badge variant={outOfStock ? 'destructive' : lowStock ? 'destructive' : 'outline'}>
              {product.stock} ชิ้น
            </Badge>
          </div>
          {inCartQty > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">อยู่ในรายการ</span>
              <span className="tabular-nums font-medium">{inCartQty} ชิ้น</span>
            </div>
          )}
          {lowStock && !outOfStock && (
            <p className="text-xs text-destructive">
              ใกล้ถึงสต๊อกขั้นต่ำ ({product.min_stock} ชิ้น)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => { onAddToCart(product); onOpenChange(false) }}
            disabled={remaining <= 0}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            {remaining <= 0 ? 'สต๊อกหมด' : 'เพิ่มลงรายการ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value, mono, bold }: {
  label: string; value: string; mono?: boolean; bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={[
        'text-right',
        mono ? 'font-mono text-xs' : '',
        bold ? 'font-semibold text-base' : '',
      ].filter(Boolean).join(' ')}>{value}</span>
    </div>
  )
}

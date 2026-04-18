'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { ImageOff, Plus, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { OptionSelector } from '@/components/pos/OptionSelector'
import { formatBaht } from '@/lib/format'
import { getProductOptions } from '@/lib/actions/options'
import { chain, money } from '@/lib/money'
import type { ProductWithStock, Category, OptionGroupWithOptions, SelectedOption } from '@/types/database'

type Props = {
  product:          ProductWithStock | null
  category:         Category | null
  open:             boolean
  onOpenChange:     (open: boolean) => void
  onAddToCart:      (product: ProductWithStock, options: SelectedOption[], unitPrice: number) => void
  inCartQty:        number
  preloadedOptions: OptionGroupWithOptions[] | null
}

export function ProductDetailDialog({
  product, category, open, onOpenChange, onAddToCart, inCartQty, preloadedOptions,
}: Props) {
  const [groups,   setGroups]   = useState<OptionGroupWithOptions[]>([])
  const [selected, setSelected] = useState<Record<string, SelectedOption[]>>({})
  const [loading,  startLoad]   = useTransition()

  // Use preloaded options if available; otherwise fetch via server action
  useEffect(() => {
    if (!open || !product?.has_options) {
      setGroups([])
      setSelected({})
      return
    }
    if (preloadedOptions !== null) {
      setGroups(preloadedOptions)
      setSelected({})
      return
    }
    startLoad(async () => {
      const data = await getProductOptions(product.id)
      setGroups(data)
      setSelected({})
    })
  }, [open, product?.id, product?.has_options, preloadedOptions])

  if (!product) return null

  const untracked  = product.track_stock === false
  const lowStock   = !untracked && product.stock <= product.min_stock
  const outOfStock = !untracked && product.stock === 0
  const remaining  = untracked ? Infinity : product.stock - inCartQty

  // Calculate price with option deltas
  const optionDelta = Object.values(selected).flat()
    .reduce((sum, s) => money(chain(sum).plus(s.price_delta)), 0)
  const unitPrice = money(chain(product.price).plus(optionDelta))

  // Validate required groups
  const allRequiredFilled = groups
    .filter((g) => g.required)
    .every((g) => (selected[g.id] ?? []).length > 0)

  const canAdd = !outOfStock && remaining > 0 && (groups.length === 0 || allRequiredFilled)

  function handleAdd() {
    const allSelected = Object.values(selected).flat()
    onAddToCart(product!, allSelected, unitPrice)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {category?.name ?? 'ไม่ระบุหมวดหมู่'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
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
            {untracked ? (
              <Badge variant="outline">ไม่จำกัด</Badge>
            ) : (
              <Badge variant={outOfStock ? 'destructive' : lowStock ? 'warning' : 'outline'}>
                {product.stock} ชิ้น
              </Badge>
            )}
          </div>
          {!untracked && inCartQty > 0 && (
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

        {/* Option groups */}
        {product.has_options && (
          <>
            <Separator />
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <OptionSelector
                groups={groups}
                selected={selected}
                onChange={(groupId, selections) =>
                  setSelected((prev) => ({ ...prev, [groupId]: selections }))
                }
              />
            )}
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            {!untracked && remaining <= 0
              ? 'สต๊อกหมด'
              : groups.length > 0 && !allRequiredFilled
              ? 'กรุณาเลือกตัวเลือก'
              : groups.length > 0
              ? `เพิ่มลงรายการ · ${formatBaht(unitPrice)}`
              : 'เพิ่มลงรายการ'}
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

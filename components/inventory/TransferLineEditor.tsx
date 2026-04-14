'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProductWithStock } from '@/types/database'

export type TransferLine = {
  productId:    string
  quantitySent: number
}

type Props = {
  /** Products with their current stock at the source branch. */
  products: ProductWithStock[]
  onChange: (lines: TransferLine[]) => void
}

export function TransferLineEditor({ products, onChange }: Props) {
  const [lines, setLines] = useState<TransferLine[]>([])
  const [pickId, setPickId] = useState('')
  const [qty, setQty]       = useState(1)

  const productMap = new Map(products.map((p) => [p.id, p]))

  function emit(next: TransferLine[]) {
    setLines(next)
    onChange(next)
  }

  function addLine() {
    if (!pickId || qty <= 0) return
    if (lines.some((l) => l.productId === pickId)) return
    const prod = productMap.get(pickId)
    if (!prod) return
    if (qty > prod.stock) return
    emit([...lines, { productId: pickId, quantitySent: qty }])
    setPickId('')
    setQty(1)
  }

  function removeLine(productId: string) {
    emit(lines.filter((l) => l.productId !== productId))
  }

  function updateQty(productId: string, nextQty: number) {
    const prod = productMap.get(productId)
    const clamped = prod ? Math.min(Math.max(1, nextQty), prod.stock) : nextQty
    emit(lines.map((l) => l.productId === productId ? { ...l, quantitySent: clamped } : l))
  }

  const totalQty = lines.reduce((s, l) => s + l.quantitySent, 0)

  return (
    <div className="space-y-3">
      {/* Add row */}
      <div className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-muted/30 p-3">
        <div className="col-span-8 flex flex-col gap-1">
          <Label className="text-xs">สินค้า (สต๊อกต้นทาง)</Label>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">— เลือกสินค้า —</option>
            {products.map((p) => {
              const added = lines.some((l) => l.productId === p.id)
              return (
                <option key={p.id} value={p.id} disabled={added || p.stock <= 0}>
                  {p.name} {p.sku ? `(${p.sku})` : ''} — คงเหลือ {p.stock}
                </option>
              )
            })}
          </select>
        </div>
        <div className="col-span-3 flex flex-col gap-1">
          <Label className="text-xs">จำนวน</Label>
          <Input
            type="number"
            min={1}
            max={productMap.get(pickId)?.stock ?? undefined}
            value={qty || ''}
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </div>
        <div className="col-span-1">
          <Button type="button" size="sm" onClick={addLine} disabled={!pickId || qty <= 0}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden form field — server action parses this */}
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {/* Existing lines */}
      {lines.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการสินค้า
        </p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">สินค้า</th>
                <th className="px-3 py-2 font-medium text-right w-24">จำนวนที่โอน</th>
                <th className="px-3 py-2 font-medium text-right w-24">คงเหลือต้นทาง</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const p = productMap.get(l.productId)
                return (
                  <tr key={l.productId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p?.name ?? '—'}</div>
                      {p?.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        max={p?.stock}
                        value={l.quantitySent || ''}
                        onChange={(e) => updateQty(l.productId, Number(e.target.value))}
                        className="text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {p?.stock ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button" size="sm" variant="outline"
                        onClick={() => removeLine(l.productId)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={1} className="px-3 py-2 text-right font-medium">รวม</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{totalQty}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

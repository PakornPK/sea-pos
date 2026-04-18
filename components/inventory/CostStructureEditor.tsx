'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBaht } from '@/lib/format'
import { addCostItem, deleteCostItem } from '@/lib/actions/inventory'
import type { ProductCostItem, Product, Category } from '@/types/database'
import { chain, money } from '@/lib/money'

type Props = {
  productId:   string
  items:       ProductCostItem[]
  allProducts: Product[]
  categories:  Category[]
}

const EMPTY_FORM = { quantity: '1', unit_cost: '0', linked_product_id: '' }

export function CostStructureEditor({ productId, items: initial, allProducts, categories }: Props) {
  const costCatIds = new Set(
    categories.filter((c) => c.category_type === 'cost').map((c) => c.id)
  )
  // Only products explicitly in a 'cost' category appear in the BOM linker
  const linkableProducts = allProducts.filter(
    (p) => p.id !== productId && p.category_id && costCatIds.has(p.category_id)
  )
  const [items, setItems]   = useState(initial)
  const [form, setForm]     = useState(EMPTY_FORM)
  const [error, setError]   = useState<string | null>(null)
  const [, startT]          = useTransition()
  const router              = useRouter()

  useEffect(() => { setItems(initial) }, [initial])

  // When a linked product is selected, auto-fill its unit cost
  function handleLinkedChange(linkedId: string) {
    const linked = allProducts.find((p) => p.id === linkedId)
    setForm((f) => ({
      ...f,
      linked_product_id: linkedId,
      unit_cost: linkedId && linked ? String(linked.cost) : '0',
    }))
  }

  async function handleAdd() {
    setError(null)
    if (!form.linked_product_id) { setError('กรุณาเลือกสินค้า/วัตถุดิบ'); return }
    const linked = allProducts.find((p) => p.id === form.linked_product_id)
    const name = linked?.name ?? form.linked_product_id

    const fd = new FormData()
    fd.set('product_id',        productId)
    fd.set('name',              name)
    fd.set('quantity',          form.quantity)
    fd.set('unit_cost',         form.unit_cost)
    fd.set('linked_product_id', form.linked_product_id)

    const res = await addCostItem(undefined, fd)
    if (res?.error) { setError(res.error); return }
    setForm(EMPTY_FORM)
    startT(() => router.refresh())
  }

  async function handleDelete(id: string) {
    startT(async () => {
      await deleteCostItem(id, productId)
      router.refresh()
    })
  }

  const total = money(items.reduce((acc, it) => acc.plus(chain(it.quantity).times(it.unit_cost)), chain(0)))

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-sm">โครงสร้างต้นทุน (BOM)</h3>
      <p className="text-xs text-muted-foreground -mt-2">
        รวมทุกรายการ → อัปเดต "ต้นทุน" สินค้าอัตโนมัติ
      </p>

      {/* Existing items */}
      {items.length > 0 && (
        <div className="rounded-md border text-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">รายการ</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">จำนวน</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">ราคา/หน่วย</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">รวม</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const linked = it.linked_product_id
                  ? allProducts.find((p) => p.id === it.linked_product_id)
                  : null
                const lineTotal = money(chain(it.quantity).times(it.unit_cost))
                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      <span>{it.name}</span>
                      {linked && (
                        <span className="ml-1.5 text-xs text-muted-foreground inline-flex items-center gap-0.5">
                          <Link2 className="h-3 w-3" />
                          {linked.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatBaht(it.unit_cost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatBaht(lineTotal)}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(it.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground text-xs font-medium">
                  ต้นทุนมาตรฐานรวม
                </td>
                <td className="px-3 py-2 text-right font-bold">{formatBaht(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground border rounded-md px-3 py-4 text-center">
          ยังไม่มีรายการต้นทุน
        </p>
      )}

      {/* Add form */}
      <div className="flex flex-col gap-2 rounded-md border p-3 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground">เพิ่มวัตถุดิบ</p>

        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          value={form.linked_product_id}
          onChange={(e) => handleLinkedChange(e.target.value)}
        >
          <option value="">— เลือกสินค้า/วัตถุดิบ —</option>
          {linkableProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.sku ? ` (${p.sku})` : ''} — {p.unit}
            </option>
          ))}
        </select>

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <Label className="text-xs">จำนวน</Label>
            <Input
              type="number" min="0" step="any"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <Label className="text-xs">ต้นทุน/หน่วย (฿)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={form.unit_cost}
              onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
            />
          </div>
          <Button type="button" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {form.linked_product_id && parseFloat(form.quantity) > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            รวม: {formatBaht(money(chain(parseFloat(form.quantity) || 0).times(parseFloat(form.unit_cost) || 0)))}
          </p>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

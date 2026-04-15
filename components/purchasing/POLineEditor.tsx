'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { ImagePlus, Plus, Trash2, PackagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { quickCreateProduct } from '@/lib/actions/inventory'
import { uploadProductImage } from '@/lib/actions/storage'
import { formatBaht } from '@/lib/format'
import { lineTotal, sumBy } from '@/lib/money'
import { computeVat, type VatConfig } from '@/lib/vat'
import type { Category, Product } from '@/types/database'

export type POLine = {
  productId: string
  quantity: number
  unitCost: number
}

type Props = {
  products: Product[]
  categories?: Category[]
  /** Company VAT config. When mode != 'none', the footer shows net/VAT/gross. */
  vatConfig?: VatConfig
  initial?: POLine[]
  onChange?: (lines: POLine[]) => void
}

export function POLineEditor({ products, categories = [], vatConfig, initial, onChange }: Props) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  const [lines, setLines] = useState<POLine[]>(initial ?? [])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [cost, setCost] = useState(0)

  // Inline "new product" mini-form state
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newSku, setNewSku]     = useState('')
  const [newBarcode, setNewBarcode] = useState('')
  const [newPrice, setNewPrice] = useState(0)
  const [newCost, setNewCost]   = useState(0)
  const [newMin, setNewMin]     = useState(0)
  const [newQty, setNewQty]     = useState(1)
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [pendingCreate, startCreate] = useTransition()

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setNewImage(file)
    setNewImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function clearImage() {
    if (imageRef.current) imageRef.current.value = ''
    setNewImage(null)
    setNewImagePreview(null)
  }

  const productMap = new Map(localProducts.map((p) => [p.id, p]))

  function emit(next: POLine[]) {
    setLines(next)
    onChange?.(next)
  }

  function addLine() {
    if (!selectedProductId || qty <= 0) return
    if (lines.some((l) => l.productId === selectedProductId)) return // one row per product
    emit([...lines, { productId: selectedProductId, quantity: qty, unitCost: cost }])
    setSelectedProductId('')
    setQty(1)
    setCost(0)
  }

  function removeLine(productId: string) {
    emit(lines.filter((l) => l.productId !== productId))
  }

  function updateLine(productId: string, patch: Partial<POLine>) {
    emit(lines.map((l) => l.productId === productId ? { ...l, ...patch } : l))
  }

  function handleCreateNew() {
    setCreateError(null)
    startCreate(async () => {
      const res = await quickCreateProduct({
        name: newName,
        sku: newSku || null,
        barcode: newBarcode.trim() || null,
        categoryId: newCategoryId || null,
        price: newPrice,
        cost: newCost,
        minStock: newMin,
      })
      if ('error' in res) {
        setCreateError(res.error)
        return
      }

      let imageUrl: string | null = null
      if (newImage) {
        const fd = new FormData()
        fd.append('file', newImage)
        const up = await uploadProductImage(res.id, undefined, fd)
        if (up?.error) {
          setCreateError(up.error)
          return
        }
        imageUrl = up?.url ?? null
      }

      const prod: Product = {
        id:          res.id,
        sku:         res.sku ?? '',
        name:        res.name,
        price:       res.price,
        cost:        res.cost,
        min_stock:   res.min_stock,
        category_id: res.category_id,
        image_url:   imageUrl,
        vat_exempt:  false,
        barcode:     newBarcode.trim() || null,
        track_stock: true,
        created_at:  new Date().toISOString(),
      }
      setLocalProducts((prev) => [...prev, prod].sort((a, b) => a.name.localeCompare(b.name)))
      emit([
        ...lines,
        { productId: prod.id, quantity: newQty, unitCost: newCost || newPrice },
      ])
      // reset mini-form
      setCreatingNew(false)
      setNewName(''); setNewSku(''); setNewBarcode(''); setNewPrice(0); setNewCost(0); setNewMin(0); setNewQty(1); setNewCategoryId('')
      clearImage()
    })
  }

  const total = sumBy(lines, (l) => lineTotal(l.unitCost, l.quantity))

  // Live VAT preview — server recomputes authoritatively on submit. Effective
  // exemption considers product.vat_exempt OR its category.vat_exempt.
  const categoryExemptById = new Map(categories.map((c) => [c.id, c.vat_exempt]))
  const breakdown = vatConfig
    ? computeVat(
        lines.map((l) => {
          const p = localProducts.find((lp) => lp.id === l.productId)
          const catExempt = p?.category_id ? categoryExemptById.get(p.category_id) ?? false : false
          return {
            price:     l.unitCost,
            quantity:  l.quantity,
            vatExempt: Boolean(p?.vat_exempt) || catExempt,
          }
        }),
        vatConfig,
      )
    : null
  const showVat = !!breakdown && vatConfig!.mode !== 'none' && breakdown.vatAmount > 0

  return (
    <div className="space-y-3">
      {/* Add existing product */}
      {!creatingNew && (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 items-end rounded-xl bg-muted/40 p-3">
            <div className="col-span-6 flex flex-col gap-1">
              <Label className="text-xs">สินค้า</Label>
              <NativeSelect
                value={selectedProductId}
                onChange={(e) => {
                  const pid = e.target.value
                  setSelectedProductId(pid)
                  const p = productMap.get(pid)
                  if (p) setCost(Number(p.cost ?? 0))
                }}
              >
                <option value="">— เลือกสินค้า —</option>
                {localProducts.map((p) => {
                  const inList = lines.some((l) => l.productId === p.id)
                  return (
                    <option key={p.id} value={p.id} disabled={inList}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} — ทุน {formatBaht(p.cost)}
                    </option>
                  )
                })}
              </NativeSelect>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">จำนวน</Label>
              <Input type="number" min={1} value={qty || ''}
                onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">ราคาทุน / หน่วย (฿)</Label>
              <Input type="number" min={0} step="0.01" value={cost || ''}
                onChange={(e) => setCost(Number(e.target.value))} />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button type="button" size="sm" onClick={addLine} disabled={!selectedProductId || qty <= 0}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreatingNew(true)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            สินค้านี้ยังไม่มีในระบบ? สร้างสินค้าใหม่
          </button>
        </div>
      )}

      {/* Inline new product mini-form */}
      {creatingNew && (
        <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <PackagePlus className="h-4 w-4" />
              สร้างสินค้าใหม่ (เพิ่มเข้าคลังและใบสั่งซื้อ)
            </div>
            <button
              type="button"
              onClick={() => { setCreatingNew(false); setCreateError(null) }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={pendingCreate}
              className={cn(
                'relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted',
                'grid place-items-center transition-colors hover:border-primary hover:bg-accent',
                pendingCreate && 'opacity-60 cursor-not-allowed'
              )}
            >
              {newImagePreview ? (
                <Image src={newImagePreview} alt="preview" fill className="object-cover" sizes="80px" unoptimized />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <div className="flex flex-col gap-1 text-xs">
              <Label className="text-xs">รูปสินค้า (ไม่บังคับ)</Label>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline"
                  onClick={() => imageRef.current?.click()} disabled={pendingCreate}>
                  {newImagePreview ? 'เปลี่ยนรูป' : 'เลือกรูป'}
                </Button>
                {newImagePreview && (
                  <Button type="button" size="sm" variant="ghost" onClick={clearImage}
                    disabled={pendingCreate}
                    className="text-muted-foreground hover:text-destructive h-7 px-2">
                    <X className="h-3 w-3" /> ลบ
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">JPG / PNG / WebP · สูงสุด 5MB</p>
            </div>
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickImage}
              disabled={pendingCreate}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6 flex flex-col gap-1">
              <Label className="text-xs">ชื่อสินค้า *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น น้ำปลาตราปลา 700ml" disabled={pendingCreate} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">SKU</Label>
              <Input value={newSku} onChange={(e) => setNewSku(e.target.value)}
                disabled={pendingCreate} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">สต๊อกขั้นต่ำ</Label>
              <Input type="number" min={0} value={newMin || ''}
                onChange={(e) => setNewMin(Number(e.target.value))}
                disabled={pendingCreate} />
            </div>

            <div className="col-span-12 flex flex-col gap-1">
              <Label className="text-xs">บาร์โค้ด</Label>
              <Input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="สแกนหรือพิมพ์ (เช่น 8851234567890)"
                disabled={pendingCreate} />
            </div>

            <div className="col-span-12 flex flex-col gap-1">
              <Label className="text-xs">หมวดหมู่</Label>
              <NativeSelect
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                disabled={pendingCreate}
              >
                <option value="">— ไม่ระบุหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">ราคาขาย (฿)</Label>
              <Input type="number" min={0} step="0.01" value={newPrice || ''}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                disabled={pendingCreate} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">ราคาทุน (฿)</Label>
              <Input type="number" min={0} step="0.01" value={newCost || ''}
                onChange={(e) => setNewCost(Number(e.target.value))}
                disabled={pendingCreate} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">จำนวนที่จะสั่ง</Label>
              <Input type="number" min={1} value={newQty || ''}
                onChange={(e) => setNewQty(Number(e.target.value))}
                disabled={pendingCreate} />
            </div>
          </div>

          {createError && <p className="text-sm text-destructive">{createError}</p>}

          <div className="flex gap-2">
            <Button
              type="button" size="sm" onClick={handleCreateNew}
              disabled={pendingCreate || !newName.trim() || newQty <= 0}
            >
              {pendingCreate ? 'กำลังสร้าง...' : 'สร้างและเพิ่มรายการ'}
            </Button>
            <Button
              type="button" size="sm" variant="outline"
              onClick={() => { setCreatingNew(false); setCreateError(null) }}
              disabled={pendingCreate}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* Existing lines */}
      {lines.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีรายการสินค้า
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">สินค้า</th>
                <th className="px-3 py-2 font-medium text-right w-24">จำนวน</th>
                <th className="px-3 py-2 font-medium text-right w-32">ราคาทุน</th>
                <th className="px-3 py-2 font-medium text-right w-28">รวม</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const p = productMap.get(l.productId) ?? localProducts.find((pp) => pp.id === l.productId)
                return (
                  <tr key={l.productId} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p?.name ?? '—'}</div>
                      {p?.sku && (
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={1} value={l.quantity || ''}
                        onChange={(e) => updateLine(l.productId, { quantity: Number(e.target.value) })}
                        className="text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} step="0.01" value={l.unitCost || ''}
                        onChange={(e) => updateLine(l.productId, { unitCost: Number(e.target.value) })}
                        className="text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatBaht(lineTotal(l.unitCost, l.quantity))}
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
              {showVat ? (
                <>
                  <tr className="text-muted-foreground">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-xs">ยอดก่อน VAT</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                      {formatBaht(breakdown!.subtotalExVat)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="text-muted-foreground">
                    <td colSpan={3} className="px-3 py-1.5 text-right text-xs">VAT {vatConfig!.rate}%</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-xs">
                      {formatBaht(breakdown!.vatAmount)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t">
                    <td colSpan={3} className="px-3 py-2 text-right font-medium">รวมทั้งสิ้น</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatBaht(breakdown!.total)}
                    </td>
                    <td></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-medium">ยอดรวม</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatBaht(total)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

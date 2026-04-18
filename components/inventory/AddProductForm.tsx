'use client'

import { useActionState, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { addProduct } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Category, Product } from '@/types/database'

type ActionState = { error: string } | undefined

type DraftOption = { name: string; price_delta: number; linked_product_id: string | null }
type DraftGroup  = {
  name:         string
  required:     boolean
  multi_select: boolean
  options:      DraftOption[]
}

type AddProductFormProps = {
  categories:  Category[]
  allProducts: Product[]
  /** Pre-filtered to option/both categories for the stock-link picker */
  linkableProducts: Product[]
}

export function AddProductForm({ categories, allProducts, linkableProducts }: AddProductFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addProduct,
    undefined
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [trackStock, setTrackStock] = useState(true)

  // ── Draft option groups (client-side only, serialized on submit) ──
  const [groups, setGroups] = useState<DraftGroup[]>([])
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRequired, setNewGroupRequired] = useState(true)
  const [newGroupMulti, setNewGroupMulti] = useState(false)
  const [optForms, setOptForms] = useState<Record<number, { name: string; delta: string; linkedProductId: string }>>({})

  function addGroup() {
    const name = newGroupName.trim()
    if (!name) return
    setGroups((prev) => [...prev, { name, required: newGroupRequired, multi_select: newGroupMulti, options: [] }])
    setNewGroupName('')
    setNewGroupRequired(true)
    setNewGroupMulti(false)
    setAddingGroup(false)
    // Menu items with options don't need stock tracking on the parent product
    setTrackStock(false)
  }

  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi))
  }

  function addOption(gi: number) {
    const form = optForms[gi] ?? { name: '', delta: '0', linkedProductId: '' }
    const name = form.name.trim()
    if (!name) return
    setGroups((prev) => prev.map((g, i) =>
      i !== gi ? g : {
        ...g,
        options: [...g.options, {
          name,
          price_delta:       Number(form.delta) || 0,
          linked_product_id: form.linkedProductId || null,
        }],
      }
    ))
    setOptForms((prev) => ({ ...prev, [gi]: { name: '', delta: '0', linkedProductId: '' } }))
  }

  function removeOption(gi: number, oi: number) {
    setGroups((prev) => prev.map((g, i) =>
      i !== gi ? g : { ...g, options: g.options.filter((_, j) => j !== oi) }
    ))
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setPreview(null); return }
    setPreview(URL.createObjectURL(file))
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = ''
    setPreview(null)
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {/* Image */}
      <div className="flex flex-col gap-1.5">
        <Label>รูปสินค้า</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className={cn(
              'relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted',
              'grid place-items-center transition-colors',
              'hover:border-primary hover:bg-accent',
              pending && 'opacity-60 cursor-not-allowed'
            )}
          >
            {preview ? (
              <Image src={preview} alt="preview" fill className="object-cover" sizes="80px" unoptimized />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <div className="flex flex-col gap-1 text-xs">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}>
              {preview ? 'เปลี่ยนรูป' : 'เลือกรูป'}
            </Button>
            {preview && (
              <Button type="button" size="sm" variant="ghost" onClick={clearFile} disabled={pending}
                className="text-muted-foreground hover:text-destructive h-7 px-2">
                <X className="mr-1 h-3 w-3" /> ลบรูป
              </Button>
            )}
            <p className="text-muted-foreground">JPG / PNG / WebP · สูงสุด 5MB</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPickFile}
          disabled={pending}
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">ชื่อสินค้า *</Label>
        <Input id="name" name="name" placeholder="เช่น น้ำดื่ม 600ml" required disabled={pending} />
      </div>

      {/* SKU */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" placeholder="เช่น WTR-600" disabled={pending} />
      </div>

      {/* Barcode */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="barcode">บาร์โค้ด</Label>
        <Input
          id="barcode"
          name="barcode"
          placeholder="สแกนบาร์โค้ดหรือพิมพ์ (เช่น 8851234567890)"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          แยกต่างหากจาก SKU — ใช้ตอนสแกนที่จุดขาย
        </p>
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_id">หมวดหมู่</Label>
        <NativeSelect id="category_id" name="category_id" disabled={pending}>
          <option value="">— ไม่ระบุหมวดหมู่ —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Price / Cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">ราคาขาย (฿)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cost">ราคาทุน (฿)</Label>
          <Input
            id="cost"
            name="cost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            disabled={pending}
          />
        </div>
      </div>

      {/* track_stock toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="track_stock"
          checked={trackStock}
          onChange={(e) => {
            setTrackStock(e.target.checked)
            const minStockInput = document.getElementById('min_stock') as HTMLInputElement | null
            if (minStockInput) minStockInput.disabled = !e.target.checked || pending
          }}
          disabled={pending}
          className="h-4 w-4"
        />
        ติดตามสต๊อก
        <span className="text-xs text-muted-foreground">
          {groups.length > 0
            ? '(ปิดอยู่ — สินค้าที่มีตัวเลือกมักเป็นเมนู ไม่ต้องติดตามสต๊อกหลัก)'
            : '(ยกเลิกเช็คสำหรับเมนูอาหาร / บริการ)'}
        </span>
      </label>

      {/* Min stock */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="min_stock">สต๊อกขั้นต่ำ</Label>
        <Input
          id="min_stock"
          name="min_stock"
          type="number"
          min={0}
          defaultValue={0}
          disabled={pending}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vat_exempt" disabled={pending} className="h-4 w-4" />
        ยกเว้น VAT สำหรับสินค้ารายการนี้
      </label>

      {/* Hidden: serialized option groups sent with the form */}
      <input type="hidden" name="option_groups" value={JSON.stringify(groups)} />

      <Separator />

      {/* Option groups */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>ตัวเลือกสินค้า</Label>
          {!addingGroup && (
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingGroup(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              เพิ่มกลุ่มตัวเลือก
            </Button>
          )}
        </div>

        {addingGroup && (
          <div className="rounded-2xl border border-dashed p-3 space-y-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="ชื่อกลุ่ม เช่น ความหวาน, ขนาด"
              className="h-8 text-[13px]"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
              autoFocus
            />
            <div className="flex gap-4 text-[13px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newGroupRequired} onChange={(e) => setNewGroupRequired(e.target.checked)} className="rounded" />
                จำเป็นต้องเลือก
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newGroupMulti} onChange={(e) => setNewGroupMulti(e.target.checked)} className="rounded" />
                เลือกได้หลายอย่าง
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={addGroup}>บันทึก</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAddingGroup(false)}>ยกเลิก</Button>
            </div>
          </div>
        )}

        {groups.length === 0 && !addingGroup && (
          <p className="text-[13px] text-muted-foreground">ยังไม่มีตัวเลือก — ข้ามได้ถ้าสินค้าไม่มีตัวเลือก</p>
        )}

        {groups.map((group, gi) => {
          const optForm = optForms[gi] ?? { name: '', delta: '0' }
          return (
            <div key={gi} className="rounded-2xl border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <span className="flex-1 text-[13px] font-semibold">{group.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {group.required ? 'จำเป็น' : 'ไม่จำเป็น'}
                  {group.multi_select ? ' · เลือกหลาย' : ' · เลือกเดียว'}
                </span>
                <button type="button" onClick={() => removeGroup(gi)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="px-3 py-2 space-y-2">
                {group.options.map((opt, oi) => {
                  const linked = opt.linked_product_id
                    ? allProducts.find((p) => p.id === opt.linked_product_id)
                    : null
                  return (
                    <div key={oi} className="flex items-center gap-2 text-[13px]">
                      <span className="flex-1">{opt.name}</span>
                      {linked && (
                        <span className="text-[11px] text-muted-foreground border rounded px-1.5 py-0.5">
                          📦 {linked.name}
                        </span>
                      )}
                      {opt.price_delta !== 0 && (
                        <span className={cn('tabular-nums text-[12px]', opt.price_delta > 0 ? 'text-primary' : 'text-destructive')}>
                          {opt.price_delta > 0 ? '+' : ''}{opt.price_delta}
                        </span>
                      )}
                      <button type="button" onClick={() => removeOption(gi, oi)} className="text-muted-foreground/30 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
                <div className="flex gap-2 items-end flex-wrap pt-1">
                  <Input
                    value={optForm.name}
                    onChange={(e) => setOptForms((p) => ({ ...p, [gi]: { ...optForm, name: e.target.value } }))}
                    placeholder="ชื่อตัวเลือก"
                    className="h-7 text-[13px] flex-1 min-w-[100px]"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption(gi))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={optForm.delta}
                    onChange={(e) => setOptForms((p) => ({ ...p, [gi]: { ...optForm, delta: e.target.value } }))}
                    className="h-7 text-[13px] w-20"
                    placeholder="ราคา +/-"
                  />
                  <select
                    value={optForm.linkedProductId}
                    onChange={(e) => setOptForms((p) => ({ ...p, [gi]: { ...optForm, linkedProductId: e.target.value } }))}
                    className="h-7 flex-1 min-w-[130px] rounded-md border border-input bg-background px-2 text-[13px]"
                  >
                    <option value="">— ไม่ตัดสต๊อก —</option>
                    {linkableProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => addOption(gi)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
      </Button>
    </form>
  )
}

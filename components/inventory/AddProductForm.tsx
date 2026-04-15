'use client'

import { useActionState, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X } from 'lucide-react'
import { addProduct } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

type ActionState = { error: string } | undefined

type AddProductFormProps = {
  categories: Category[]
}

export function AddProductForm({ categories }: AddProductFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addProduct,
    undefined
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

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
          defaultChecked
          onChange={(e) => {
            const minStockInput = document.getElementById('min_stock') as HTMLInputElement | null
            if (minStockInput) minStockInput.disabled = !e.target.checked || pending
          }}
          disabled={pending}
          className="h-4 w-4"
        />
        ติดตามสต๊อก
        <span className="text-xs text-muted-foreground">(ยกเลิกเช็คสำหรับเมนูอาหาร / บริการ)</span>
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

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
      </Button>
    </form>
  )
}

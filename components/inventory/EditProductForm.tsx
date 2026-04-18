'use client'

import { useActionState } from 'react'
import { updateProduct } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import type { Category, Product } from '@/types/database'

type ActionState = { error: string } | undefined

type EditProductFormProps = {
  product: Product
  categories: Category[]
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const updateWith = updateProduct.bind(null, product.id)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateWith,
    undefined
  )

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">ชื่อสินค้า *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={product.name}
          required
          disabled={pending}
        />
      </div>

      {/* SKU */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          defaultValue={product.sku ?? ''}
          disabled={pending}
        />
      </div>

      {/* Unit */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit">หน่วย</Label>
        <Input
          id="unit"
          name="unit"
          list="unit-suggestions"
          defaultValue={product.unit}
          placeholder="เช่น ชิ้น, กก., ลิตร"
          disabled={pending}
        />
        <datalist id="unit-suggestions">
          <option value="ชิ้น" />
          <option value="กล่อง" />
          <option value="แพ็ค" />
          <option value="ถุง" />
          <option value="ขวด" />
          <option value="กก." />
          <option value="กรัม" />
          <option value="ลิตร" />
          <option value="มล." />
          <option value="โหล" />
          <option value="ม้วน" />
          <option value="เมตร" />
          <option value="ea" />
        </datalist>
      </div>

      {/* Barcode */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="barcode">บาร์โค้ด</Label>
        <Input
          id="barcode"
          name="barcode"
          defaultValue={product.barcode ?? ''}
          disabled={pending}
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_id">หมวดหมู่</Label>
        <NativeSelect
          id="category_id"
          name="category_id"
          defaultValue={product.category_id ?? ''}
          disabled={pending}
        >
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
            defaultValue={product.price}
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
            defaultValue={product.cost}
            disabled={pending}
          />
        </div>
      </div>

      {/* track_stock toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="track_stock"
          defaultChecked={product.track_stock}
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
          defaultValue={product.min_stock}
          disabled={pending || !product.track_stock}
        />
      </div>

      {/* VAT exempt */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="vat_exempt"
          defaultChecked={product.vat_exempt}
          disabled={pending}
          className="h-4 w-4"
        />
        ยกเว้น VAT สำหรับสินค้ารายการนี้
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'บันทึก'}
      </Button>
    </form>
  )
}

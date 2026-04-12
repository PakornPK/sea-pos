'use client'

import { useActionState } from 'react'
import { addProduct } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
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

      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_id">หมวดหมู่</Label>
        <select
          id="category_id"
          name="category_id"
          disabled={pending}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">— ไม่ระบุหมวดหมู่ —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
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

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
      </Button>
    </form>
  )
}

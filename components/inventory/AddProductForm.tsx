'use client'

import { useActionState } from 'react'
import { addProduct } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = { error: string } | undefined

export function AddProductForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addProduct,
    undefined
  )

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">ชื่อสินค้า *</Label>
        <Input
          id="name"
          name="name"
          placeholder="เช่น น้ำดื่ม 600ml"
          required
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          placeholder="เช่น WTR-600"
          disabled={pending}
        />
      </div>

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

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
      </Button>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { addCategory } from '@/lib/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="font-medium text-sm">เพิ่มหมวดหมู่ใหม่</p>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-8">
          <Label htmlFor="cat-name" className="text-xs">ชื่อหมวดหมู่ *</Label>
          <Input
            id="cat-name"
            name="name"
            placeholder="เช่น เครื่องดื่ม, อาหาร..."
            disabled={pending}
          />
        </div>
        <div className="col-span-4">
          <Label htmlFor="cat-prefix" className="text-xs">รหัสนำหน้า SKU</Label>
          <Input
            id="cat-prefix"
            name="sku_prefix"
            placeholder="เช่น DRK"
            maxLength={6}
            disabled={pending}
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        หากระบุ ระบบจะออก SKU อัตโนมัติในรูปแบบ <code>PREFIX-0001</code> เมื่อสร้างสินค้าในหมวดหมู่นี้โดยไม่กรอก SKU เอง
      </p>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังบันทึก...' : 'เพิ่มหมวดหมู่'}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

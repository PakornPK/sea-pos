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
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="cat-name" className="sr-only">ชื่อหมวดหมู่</Label>
          <Input
            id="cat-name"
            name="name"
            placeholder="เช่น เครื่องดื่ม, อาหาร..."
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก...' : 'เพิ่ม'}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}

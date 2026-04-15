'use client'

import { useActionState } from 'react'
import { addSupplier, updateSupplier } from '@/lib/actions/suppliers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormReset } from '@/hooks/useFormReset'
import type { Supplier } from '@/types/database'

export function SupplierForm({
  supplier, onDone,
}: {
  supplier?: Supplier
  onDone?: () => void
}) {
  const isEdit = Boolean(supplier)
  const action = isEdit ? updateSupplier : addSupplier
  const [state, formAction, pending] = useActionState(action, undefined)
  const formRef = useFormReset(state, { resetForm: !isEdit, onSuccess: onDone })

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4 space-y-4"
    >
      {isEdit && <input type="hidden" name="id" value={supplier!.id} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อผู้จำหน่าย *</Label>
          <Input id="name" name="name" required disabled={pending}
            defaultValue={supplier?.name ?? ''} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_name">ผู้ติดต่อ</Label>
          <Input id="contact_name" name="contact_name" disabled={pending}
            defaultValue={supplier?.contact_name ?? ''} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input id="phone" name="phone" disabled={pending}
            defaultValue={supplier?.phone ?? ''} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input id="email" name="email" type="email" disabled={pending}
            defaultValue={supplier?.email ?? ''} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มผู้จำหน่าย'}
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            ยกเลิก
          </Button>
        )}
      </div>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { addCustomer, updateCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormReset } from '@/hooks/useFormReset'
import type { Customer } from '@/types/database'

type CustomerFormProps = {
  customer?: Customer
  onDone?: () => void
}

export function CustomerForm({ customer, onDone }: CustomerFormProps) {
  const isEdit = Boolean(customer)
  const action = isEdit ? updateCustomer : addCustomer
  const [state, formAction, pending] = useActionState(action, undefined)
  const formRef = useFormReset(state, { resetForm: !isEdit, onSuccess: onDone })

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-4 space-y-4"
    >
      {isEdit && <input type="hidden" name="id" value={customer!.id} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อลูกค้า *</Label>
          <Input
            id="name" name="name" required disabled={pending}
            defaultValue={customer?.name ?? ''}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input
            id="phone" name="phone" disabled={pending}
            defaultValue={customer?.phone ?? ''}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email" name="email" type="email" disabled={pending}
            defaultValue={customer?.email ?? ''}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">ที่อยู่</Label>
          <Input
            id="address" name="address" disabled={pending}
            defaultValue={customer?.address ?? ''}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
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

'use client'

import { useActionState, useEffect, useState } from 'react'
import { Check, CircleX, Pencil } from 'lucide-react'
import { updatePlan } from '@/lib/actions/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types/database'

function formatLimit(n: number | null): string {
  return n === null ? 'ไม่จำกัด' : n.toLocaleString('th-TH')
}

function formatPrice(n: number | null): string {
  if (n === null) return 'ติดต่อเรา'
  if (n === 0)    return 'ฟรี'
  return `฿${n.toLocaleString('th-TH')}/เดือน`
}

export function PlanEditor({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(updatePlan, undefined)

  useEffect(() => {
    // Collapse the editor back to read-only after a successful save.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setEditing(false)
  }, [state])

  if (!editing) {
    return (
      <div className={cn(
        'rounded-lg border bg-card p-5',
        !plan.is_active && 'opacity-60',
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{plan.name}</h3>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{plan.code}</code>
              {!plan.is_active && (
                <span className="text-xs text-muted-foreground">(ปิดการใช้งาน)</span>
              )}
            </div>
            {plan.description && (
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            แก้ไข
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="ราคา" value={formatPrice(plan.monthly_price_baht)} />
          <Field label="สินค้าสูงสุด" value={formatLimit(plan.max_products)} />
          <Field label="ผู้ใช้งานสูงสุด" value={formatLimit(plan.max_users)} />
          <Field label="สาขาสูงสุด" value={formatLimit(plan.max_branches)} />
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-lg border border-primary bg-card p-5 space-y-4">
      <input type="hidden" name="code" value={plan.code} />
      <input type="hidden" name="sort_order" value={plan.sort_order} />

      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">แก้ไขแพ็กเกจ</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{plan.code}</code>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${plan.code}`}>ชื่อแพ็กเกจ *</Label>
          <Input
            id={`name-${plan.code}`}
            name="name"
            required
            defaultValue={plan.name}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`price-${plan.code}`}>ราคาต่อเดือน (฿)</Label>
          <Input
            id={`price-${plan.code}`}
            name="monthly_price_baht"
            type="number"
            min={0}
            step="0.01"
            defaultValue={plan.monthly_price_baht ?? ''}
            disabled={pending}
            placeholder="เว้นว่างหรือ 'contact' = ติดต่อเรา"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`desc-${plan.code}`}>คำอธิบาย</Label>
        <Input
          id={`desc-${plan.code}`}
          name="description"
          defaultValue={plan.description ?? ''}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`mp-${plan.code}`}>สินค้าสูงสุด</Label>
          <Input
            id={`mp-${plan.code}`}
            name="max_products"
            type="number"
            min={0}
            defaultValue={plan.max_products ?? ''}
            disabled={pending}
            placeholder="เว้นว่าง = ไม่จำกัด"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`mu-${plan.code}`}>ผู้ใช้งานสูงสุด</Label>
          <Input
            id={`mu-${plan.code}`}
            name="max_users"
            type="number"
            min={0}
            defaultValue={plan.max_users ?? ''}
            disabled={pending}
            placeholder="เว้นว่าง = ไม่จำกัด"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`mb-${plan.code}`}>สาขาสูงสุด</Label>
          <Input
            id={`mb-${plan.code}`}
            name="max_branches"
            type="number"
            min={0}
            defaultValue={plan.max_branches ?? ''}
            disabled={pending}
            placeholder="เว้นว่าง = ไม่จำกัด"
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={plan.is_active}
          disabled={pending}
          className="h-4 w-4 rounded border-input"
        />
        เปิดใช้งานแพ็กเกจนี้
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="mr-1 h-3.5 w-3.5" />
          {pending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          <CircleX className="mr-1 h-3.5 w-3.5" />
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

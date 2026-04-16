'use client'

import { useActionState, useState } from 'react'
import { Plus, Check, CircleX, ChevronDown } from 'lucide-react'
import { createPlan } from '@/lib/actions/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreatePlanForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createPlan, undefined)

  if (state?.success && open) setOpen(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-card px-5 py-4 text-[14px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors w-full"
      >
        <Plus className="h-4 w-4" />
        สร้างแพ็กเกจใหม่
      </button>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-2 ring-primary/50 overflow-hidden">
      <div className="flex items-center gap-2 bg-primary/5 border-b border-primary/20 px-5 py-3">
        <Plus className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-[14px]">สร้างแพ็กเกจใหม่</span>
      </div>

      <form action={formAction} className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-code">รหัสแพ็กเกจ * <span className="text-[11px] text-muted-foreground font-normal">(ตัวพิมพ์เล็ก, _ ได้)</span></Label>
            <Input id="new-code" name="code" required placeholder="เช่น pro_plus" disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-name">ชื่อแพ็กเกจ *</Label>
            <Input id="new-name" name="name" required placeholder="เช่น โปร Plus" disabled={pending} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-price">ราคาต่อเดือน (฿)</Label>
            <Input id="new-price" name="monthly_price_baht" type="number" min={0} step="0.01" placeholder="เว้นว่าง = ติดต่อเรา" disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-yprice">
              ราคาต่อปี (฿)
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">เว้นว่าง = ไม่มีรายปี</span>
            </Label>
            <Input id="new-yprice" name="yearly_price_baht" type="number" min={0} step="0.01" placeholder="เช่น 3,990" disabled={pending} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-desc">คำอธิบาย</Label>
            <Input id="new-desc" name="description" placeholder="คำอธิบายสั้น ๆ" disabled={pending} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-mp">สินค้าสูงสุด</Label>
            <Input id="new-mp" name="max_products" type="number" min={0} placeholder="ไม่จำกัด" disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-mu">ผู้ใช้งานสูงสุด</Label>
            <Input id="new-mu" name="max_users" type="number" min={0} placeholder="ไม่จำกัด" disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-mb">สาขาสูงสุด</Label>
            <Input id="new-mb" name="max_branches" type="number" min={0} placeholder="ไม่จำกัด" disabled={pending} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-input" disabled={pending} />
            เปิดใช้งานทันที
          </label>
          <input type="hidden" name="sort_order" value="99" />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? 'กำลังสร้าง...' : 'สร้างแพ็กเกจ'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            <CircleX className="h-3.5 w-3.5" />
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  )
}

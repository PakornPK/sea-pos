'use client'

import { useActionState, useState } from 'react'
import { CreditCard, Check, X } from 'lucide-react'
import { recordPayment } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Subscription } from '@/types/database'

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function addYears(date: Date, n: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + n)
  return d
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function RecordPaymentDialog({
  subscription,
  companyId,
  companyName,
}: {
  subscription: Subscription
  companyId: string
  companyName: string
}) {
  const [open, setOpen] = useState(false)
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(subscription.billing_cycle ?? 'monthly')
  const [state, formAction, pending] = useActionState(recordPayment, undefined)

  if (state?.success && open) setOpen(false)

  const today = new Date()
  const nextEnd = cycle === 'yearly' ? addYears(today, 1) : addMonths(today, 1)

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CreditCard className="h-3.5 w-3.5" />
        บันทึกการชำระเงิน
      </Button>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-2 ring-primary/50 overflow-hidden">
      <div className="flex items-center gap-2 bg-primary/5 border-b border-primary/20 px-5 py-3">
        <CreditCard className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-[14px]">บันทึกการชำระเงิน</span>
        <span className="text-[13px] text-muted-foreground">— {companyName}</span>
      </div>

      <form action={formAction} className="p-5 space-y-4">
        <input type="hidden" name="subscription_id" value={subscription.id} />
        <input type="hidden" name="company_id" value={companyId} />
        <input type="hidden" name="billing_cycle" value={cycle} />

        {/* Billing cycle toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1 w-fit text-[13px]">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              disabled={pending}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                cycle === c
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c === 'monthly' ? 'รายเดือน' : 'รายปี'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">จำนวนเงิน (฿) *</Label>
            <Input id="pay-amount" name="amount_baht" type="number" min={1} step="0.01" required disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-method">วิธีชำระ</Label>
            <select
              id="pay-method"
              name="method"
              disabled={pending}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="bank_transfer">โอนธนาคาร</option>
              <option value="promptpay">PromptPay</option>
              <option value="cash">เงินสด</option>
              <option value="other">อื่น ๆ</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-date">วันที่ชำระ</Label>
            <Input id="pay-date" name="paid_at" type="date" defaultValue={toDateInput(today)} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-ref">เลขอ้างอิง / Ref</Label>
            <Input id="pay-ref" name="reference_no" disabled={pending} placeholder="หมายเลขรายการโอน" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-period-start">เริ่มรอบบิล</Label>
            <Input id="pay-period-start" name="period_start" type="date" defaultValue={toDateInput(today)} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-period-end">สิ้นสุดรอบบิล</Label>
            <Input id="pay-period-end" name="period_end" type="date" defaultValue={toDateInput(nextEnd)} disabled={pending} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-note">หมายเหตุ</Label>
          <Input id="pay-note" name="note" disabled={pending} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pay-receipt">
            สลิป / หลักฐานการชำระเงิน
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">(ไม่บังคับ · JPG, PNG, PDF)</span>
          </Label>
          <input
            id="pay-receipt"
            name="receipt"
            type="file"
            accept="image/*,.pdf"
            disabled={pending}
            className="text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[12px] file:font-medium hover:file:bg-muted/80"
          />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? 'กำลังบันทึก...' : 'บันทึก + ออกใบกำกับภาษี'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            <X className="h-3.5 w-3.5" />
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  )
}

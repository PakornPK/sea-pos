'use client'

import { useActionState, useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { adjustMemberPoints } from '@/lib/actions/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdjustPointsForm({ memberId }: { memberId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(adjustMemberPoints, undefined)

  if (state?.success && open) setOpen(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        ปรับแต้มด้วยตนเอง
      </button>

      {open && (
        <form action={formAction} className="mt-3 space-y-3 rounded-2xl bg-card ring-1 ring-border/60 p-4">
          <input type="hidden" name="member_id" value={memberId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-pts">จำนวนแต้ม</Label>
              <Input id="adj-pts" name="points" type="number" step="1" required disabled={pending}
                placeholder="+ เพิ่ม / - หัก" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-note">หมายเหตุ</Label>
              <Input id="adj-note" name="note" disabled={pending} placeholder="เหตุผล" />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </form>
      )}
    </div>
  )
}

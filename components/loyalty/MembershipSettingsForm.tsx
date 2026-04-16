'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { updateMembershipSettings } from '@/lib/actions/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MembershipSettings } from '@/types/database'

export function MembershipSettingsForm({ settings }: { settings: MembershipSettings | null }) {
  const [state, formAction, pending] = useActionState(updateMembershipSettings, undefined)
  const s = settings

  // Build mlm level map
  const mlmMap: Record<number, number> = {}
  for (const l of s?.mlm_levels ?? []) mlmMap[l.level] = l.rate_pct

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h2 className="font-semibold text-[14px]">การตั้งค่าแต้มและส่วนลด</h2>
      </div>
      <form action={formAction} className="p-5 space-y-5">
        {/* Enable toggle */}
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="enabled" defaultChecked={s?.enabled ?? true}
            className="h-4 w-4 rounded border-input" disabled={pending} />
          เปิดระบบสมาชิก
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ppb">แต้มต่อ ฿1</Label>
            <Input id="ppb" name="points_per_baht" type="number" min={0} step="0.01"
              defaultValue={s?.points_per_baht ?? 1} disabled={pending} />
            <p className="text-[11px] text-muted-foreground">ซื้อ ฿100 = {(s?.points_per_baht ?? 1) * 100} แต้ม</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bpp">มูลค่า 1 แต้ม (฿)</Label>
            <Input id="bpp" name="baht_per_point" type="number" min={0} step="0.01"
              defaultValue={s?.baht_per_point ?? 0.1} disabled={pending} />
            <p className="text-[11px] text-muted-foreground">100 แต้ม = ฿{(s?.baht_per_point ?? 0.1) * 100}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mrp">ใช้แต้มสูงสุด (%)</Label>
            <Input id="mrp" name="max_redeem_pct" type="number" min={0} max={100} step="1"
              defaultValue={s?.max_redeem_pct ?? 20} disabled={pending} />
            <p className="text-[11px] text-muted-foreground">ต่อบิล</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exp">หมดอายุ (วัน)</Label>
          <Input id="exp" name="points_expiry_days" type="number" min={1} step="1"
            defaultValue={s?.points_expiry_days ?? ''} placeholder="ว่าง = ไม่หมดอายุ"
            className="max-w-[200px]" disabled={pending} />
        </div>

        {/* MLM section */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <label className="flex items-center gap-2 text-[13px] font-medium">
            <input type="checkbox" name="mlm_enabled" defaultChecked={s?.mlm_enabled ?? false}
              className="h-4 w-4 rounded border-input" disabled={pending} />
            เปิดระบบ MLM (commission ขึ้นสายงาน)
          </label>
          <p className="text-[12px] text-muted-foreground">
            เมื่อสมาชิกซื้อสินค้า ผู้แนะนำแต่ละระดับจะได้รับ commission เป็น % ของยอดซื้อเป็นแต้ม
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex flex-col gap-1">
                <Label htmlFor={`mlm-${level}`} className="text-[11px]">ระดับ {level} (%)</Label>
                <Input
                  id={`mlm-${level}`}
                  name={`mlm_level_${level}`}
                  type="number" min={0} max={100} step="0.1"
                  defaultValue={mlmMap[level] ?? ''}
                  placeholder="0"
                  disabled={pending}
                  className="text-[12px]"
                />
              </div>
            ))}
          </div>
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">บันทึกแล้ว</p>}

        <Button type="submit" size="sm" disabled={pending}>
          <Check className="h-3.5 w-3.5" />
          {pending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </form>
    </div>
  )
}

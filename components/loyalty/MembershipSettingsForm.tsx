'use client'

import { useState, useEffect, useTransition } from 'react'
import { Check } from 'lucide-react'
import { updateMembershipSettings } from '@/lib/actions/loyalty'
import { fetchLoyaltyRepo } from '@/lib/repositories/fetch/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MembershipSettings } from '@/types/database'

type Fields = {
  enabled: boolean
  points_per_baht: string
  baht_per_point: string
  max_redeem_pct: string
  points_expiry_days: string
}

function toFields(s: MembershipSettings | null): Fields {
  return {
    enabled:            s?.enabled             ?? true,
    points_per_baht:    String(s?.points_per_baht    ?? 1),
    baht_per_point:     String(s?.baht_per_point     ?? 0.1),
    max_redeem_pct:     String(s?.max_redeem_pct     ?? 20),
    points_expiry_days: s?.points_expiry_days != null ? String(s.points_expiry_days) : '',
  }
}

export function MembershipSettingsForm({ settings: initial }: { settings: MembershipSettings | null }) {
  const [fields, setFields] = useState<Fields>(() => toFields(initial))
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetchLoyaltyRepo.getSettings().then((fresh) => setFields(toFields(fresh)))
  }, [])

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(undefined)
    startTransition(async () => {
      const result = await updateMembershipSettings(undefined, formData)
      if (result?.error) { setError(result.error); return }
      const fresh = await fetchLoyaltyRepo.getSettings()
      setFields(toFields(fresh))
    })
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h2 className="font-semibold text-[14px]">การตั้งค่าแต้มและส่วนลด</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="enabled"
            checked={fields.enabled} onChange={set('enabled')}
            className="h-4 w-4 rounded border-input" disabled={isPending} />
          เปิดระบบสมาชิก
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ppb">แต้มต่อ ฿1</Label>
            <Input id="ppb" name="points_per_baht" type="number" min={0} step="0.01"
              value={fields.points_per_baht} onChange={set('points_per_baht')} disabled={isPending} />
            <p className="text-[11px] text-muted-foreground">ซื้อ ฿100 = {(Number(fields.points_per_baht) || 1) * 100} แต้ม</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bpp">มูลค่า 1 แต้ม (฿)</Label>
            <Input id="bpp" name="baht_per_point" type="number" min={0} step="0.01"
              value={fields.baht_per_point} onChange={set('baht_per_point')} disabled={isPending} />
            <p className="text-[11px] text-muted-foreground">100 แต้ม = ฿{(Number(fields.baht_per_point) || 0.1) * 100}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mrp">ใช้แต้มสูงสุด (%)</Label>
            <Input id="mrp" name="max_redeem_pct" type="number" min={0} max={100} step="1"
              value={fields.max_redeem_pct} onChange={set('max_redeem_pct')} disabled={isPending} />
            <p className="text-[11px] text-muted-foreground">ต่อบิล</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exp">หมดอายุ (วัน)</Label>
          <Input id="exp" name="points_expiry_days" type="number" min={1} step="1"
            value={fields.points_expiry_days} onChange={set('points_expiry_days')}
            placeholder="ว่าง = ไม่หมดอายุ" className="max-w-[200px]" disabled={isPending} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="h-3.5 w-3.5" />
          {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </form>
    </div>
  )
}

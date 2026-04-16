'use client'

import { useActionState, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { upsertTier, deleteTier } from '@/lib/actions/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MembershipTier } from '@/types/database'

function TierForm({
  tier,
  onDone,
}: {
  tier?: MembershipTier
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(upsertTier, undefined)
  if (state?.success) onDone()

  return (
    <form action={formAction} className="rounded-2xl bg-card ring-2 ring-primary/40 p-4 space-y-3">
      {tier && <input type="hidden" name="id" value={tier.id} />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>ชื่อระดับ *</Label>
          <Input name="name" required defaultValue={tier?.name ?? ''} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>สี</Label>
          <div className="flex gap-1.5">
            <input type="color" name="color" defaultValue={tier?.color ?? '#6366f1'}
              className="h-9 w-10 rounded-md border border-input cursor-pointer" disabled={pending} />
            <Input name="color" defaultValue={tier?.color ?? '#6366f1'} disabled={pending} className="font-mono text-[12px]" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>ยอดซื้อขั้นต่ำ (฿)</Label>
          <Input name="min_spend_baht" type="number" min={0} step="1"
            defaultValue={tier?.min_spend_baht ?? 0} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>ส่วนลด (%)</Label>
          <Input name="discount_pct" type="number" min={0} max={100} step="0.1"
            defaultValue={tier?.discount_pct ?? 0} disabled={pending} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>ตัวคูณแต้ม</Label>
          <Input name="points_multiplier" type="number" min={1} step="0.1"
            defaultValue={tier?.points_multiplier ?? 1} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>ลำดับ</Label>
          <Input name="sort_order" type="number" min={0}
            defaultValue={tier?.sort_order ?? 0} disabled={pending} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="h-3.5 w-3.5" />
          {pending ? 'กำลังบันทึก...' : tier ? 'อัปเดต' : 'เพิ่มระดับ'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone} disabled={pending}>
          <X className="h-3.5 w-3.5" />
          ยกเลิก
        </Button>
      </div>
    </form>
  )
}

function TierRow({ tier }: { tier: MembershipTier }) {
  const [editing, setEditing] = useState(false)

  async function handleDelete() {
    if (!confirm(`ลบระดับ "${tier.name}" ?`)) return
    await deleteTier(tier.id)
  }

  if (editing) return <TierForm tier={tier} onDone={() => setEditing(false)} />

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card ring-1 ring-border/60">
      <div
        className="h-8 w-8 shrink-0 rounded-full"
        style={{ backgroundColor: tier.color }}
      />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-0.5 min-w-0">
        <span className="font-medium text-[14px]">{tier.name}</span>
        <span className="text-[12px] text-muted-foreground">
          ซื้อ ≥ ฿{tier.min_spend_baht.toLocaleString('th-TH')}
        </span>
        <span className="text-[12px] text-muted-foreground">
          ส่วนลด {tier.discount_pct}%
        </span>
        <span className="text-[12px] text-muted-foreground">
          แต้ม ×{tier.points_multiplier}
        </span>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2"
          onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
          onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function TierList({ tiers }: { tiers: MembershipTier[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[14px]">ระดับสมาชิก</h2>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          เพิ่มระดับ
        </Button>
      </div>

      {adding && <TierForm onDone={() => setAdding(false)} />}

      {tiers.map((tier) => (
        <TierRow key={tier.id} tier={tier} />
      ))}

      {tiers.length === 0 && !adding && (
        <div className="rounded-2xl border-2 border-dashed border-border/50 px-5 py-6 text-center text-[13px] text-muted-foreground">
          ยังไม่มีระดับสมาชิก — เพิ่มระดับแรกได้เลย
        </div>
      )}
    </div>
  )
}

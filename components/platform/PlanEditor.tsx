'use client'

import { useActionState, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, CircleX, Pencil, Trash2, Building2 } from 'lucide-react'
import { updatePlan, deletePlan } from '@/lib/actions/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanWithUsage } from '@/lib/repositories/contracts'

function formatLimit(n: number | null): string {
  return n === null ? 'ไม่จำกัด' : n.toLocaleString('th-TH')
}

function formatPrice(n: number | null, suffix = '/เดือน'): string {
  if (n === null) return 'ติดต่อเรา'
  if (n === 0)    return 'ฟรี'
  return `฿${n.toLocaleString('th-TH')}${suffix}`
}

function yearlySavingsPct(monthly: number | null, yearly: number | null): number | null {
  if (!monthly || !yearly) return null
  const saving = (monthly * 12 - yearly) / (monthly * 12) * 100
  return saving > 0 ? Math.round(saving) : null
}

export function PlanEditor({ plan }: { plan: PlanWithUsage }) {
  const [editing, setEditing] = useState(false)
  const [updateState, updateAction, updatePending] = useActionState(updatePlan, undefined)
  const [deleteState, deleteAction, deletePending] = useActionState(deletePlan, undefined)

  useEffect(() => {
    if (updateState?.success) setEditing(false)
  }, [updateState])

  const pending = updatePending || deletePending

  if (!editing) {
    return (
      <div className={cn(
        'rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden',
        !plan.is_active && 'opacity-60',
      )}>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <h3 className="font-semibold text-[15px] truncate">{plan.name}</h3>
            <code className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">{plan.code}</code>
            {!plan.is_active && (
              <Badge variant="outline" className="shrink-0 text-[11px]">ปิดการใช้งาน</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="tabular-nums font-medium">{plan.company_count}</span>
              <span>บริษัท</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              แก้ไข
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-y divide-border/40">
          <Stat label="ราคา/เดือน" value={formatPrice(plan.monthly_price_baht)} highlight />
          <div className="flex flex-col gap-0.5 px-5 py-3">
            <span className="text-[11px] text-muted-foreground">ราคา/ปี</span>
            <span className="text-[14px] font-semibold tabular-nums">
              {formatPrice(plan.yearly_price_baht, '/ปี')}
            </span>
            {yearlySavingsPct(plan.monthly_price_baht, plan.yearly_price_baht) !== null && (
              <span className="text-[10px] font-medium text-green-600">
                ประหยัด {yearlySavingsPct(plan.monthly_price_baht, plan.yearly_price_baht)}%
              </span>
            )}
          </div>
          <Stat label="สินค้าสูงสุด" value={formatLimit(plan.max_products)} />
          <Stat label="ผู้ใช้งานสูงสุด" value={formatLimit(plan.max_users)} />
          <Stat label="สาขาสูงสุด" value={formatLimit(plan.max_branches)} />
        </div>

        {plan.description && (
          <p className="px-5 py-2.5 text-[13px] text-muted-foreground border-t border-border/40">
            {plan.description}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-2 ring-primary overflow-hidden">
      {/* Edit header */}
      <div className="flex items-center gap-2 bg-primary/5 border-b border-primary/20 px-5 py-3">
        <Pencil className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-[14px]">แก้ไขแพ็กเกจ</span>
        <code className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">{plan.code}</code>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[12px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="tabular-nums font-medium">{plan.company_count}</span>
          <span>บริษัท</span>
        </div>
      </div>

      <form action={updateAction} className="p-5 space-y-4">
        <input type="hidden" name="code" value={plan.code} />
        <input type="hidden" name="sort_order" value={plan.sort_order} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name-${plan.code}`}>ชื่อแพ็กเกจ *</Label>
            <Input id={`name-${plan.code}`} name="name" required defaultValue={plan.name} disabled={pending} />
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
              placeholder="เว้นว่าง = ติดต่อเรา"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`yprice-${plan.code}`}>
              ราคาต่อปี (฿)
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">เว้นว่าง = ไม่มีรายปี</span>
            </Label>
            <Input
              id={`yprice-${plan.code}`}
              name="yearly_price_baht"
              type="number"
              min={0}
              step="0.01"
              defaultValue={plan.yearly_price_baht ?? ''}
              disabled={pending}
              placeholder={plan.monthly_price_baht ? String(Math.round((plan.monthly_price_baht ?? 0) * 10)) : 'ไม่มีรายปี'}
            />
          </div>
          <div className="flex flex-col gap-1.5 justify-end pb-0.5">
            {plan.monthly_price_baht && plan.yearly_price_baht && (
              <p className="text-[12px] text-green-600 font-medium">
                ประหยัด {yearlySavingsPct(plan.monthly_price_baht, plan.yearly_price_baht)}% เทียบรายเดือน
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`desc-${plan.code}`}>คำอธิบาย</Label>
          <Input id={`desc-${plan.code}`} name="description" defaultValue={plan.description ?? ''} disabled={pending} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`mp-${plan.code}`}>สินค้าสูงสุด</Label>
            <Input id={`mp-${plan.code}`} name="max_products" type="number" min={0} defaultValue={plan.max_products ?? ''} disabled={pending} placeholder="ไม่จำกัด" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`mu-${plan.code}`}>ผู้ใช้งานสูงสุด</Label>
            <Input id={`mu-${plan.code}`} name="max_users" type="number" min={0} defaultValue={plan.max_users ?? ''} disabled={pending} placeholder="ไม่จำกัด" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`mb-${plan.code}`}>สาขาสูงสุด</Label>
            <Input id={`mb-${plan.code}`} name="max_branches" type="number" min={0} defaultValue={plan.max_branches ?? ''} disabled={pending} placeholder="ไม่จำกัด" />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={plan.is_active} disabled={pending} className="h-4 w-4 rounded border-input" />
          เปิดใช้งานแพ็กเกจนี้
        </label>

        {updateState?.error && <p className="text-sm text-destructive">{updateState.error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {updatePending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={pending}>
            <CircleX className="h-3.5 w-3.5" />
            ยกเลิก
          </Button>
        </div>
      </form>

      {/* Delete zone — only if no companies on this plan */}
      <div className="border-t border-border/40 px-5 py-3 bg-muted/30">
        <form action={deleteAction}>
          <input type="hidden" name="code" value={plan.code} />
          <input type="hidden" name="company_count" value={plan.company_count} />
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[12px] text-muted-foreground">
              {plan.company_count > 0
                ? `ไม่สามารถลบได้ — มี ${plan.company_count} บริษัทใช้แพ็กเกจนี้`
                : 'ลบแพ็กเกจนี้ออกจากระบบ (ไม่สามารถกู้คืนได้)'}
            </p>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={pending || plan.company_count > 0}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              ลบ
            </Button>
          </div>
          {deleteState?.error && <p className="mt-1 text-[12px] text-destructive">{deleteState.error}</p>}
        </form>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-[14px] font-semibold tabular-nums', highlight && 'text-primary')}>{value}</span>
    </div>
  )
}

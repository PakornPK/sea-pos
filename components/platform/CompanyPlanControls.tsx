'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { setCompanyPlan } from '@/lib/actions/platform'
import { cn } from '@/lib/utils'
import type { Plan } from '@/types/database'

type Props = {
  companyId: string
  currentPlan: string
  plans: Plan[]
}

function formatLimit(n: number | null): string {
  return n === null ? '∞' : n.toLocaleString('th-TH')
}

function formatPrice(n: number | null): string {
  if (n === null) return 'ติดต่อเรา'
  if (n === 0)    return 'ฟรี'
  return `฿${n.toLocaleString('th-TH')}/เดือน`
}

export function CompanyPlanControls({ companyId, currentPlan, plans }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState(currentPlan)

  function apply(code: string, label: string) {
    if (code === optimistic) return
    if (!confirm(`เปลี่ยนแพ็กเกจเป็น "${label}"?`)) return
    setError(null)
    setOptimistic(code)
    startTransition(async () => {
      try {
        await setCompanyPlan(companyId, code)
      } catch (e) {
        setOptimistic(currentPlan)
        setError(e instanceof Error ? e.message : 'เปลี่ยนแพ็กเกจไม่สำเร็จ')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const isCurrent = p.code === optimistic
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => apply(p.code, p.name)}
              disabled={pending}
              className={cn(
                'flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-colors',
                isCurrent
                  ? 'border-primary bg-accent'
                  : 'border-border hover:bg-accent/50',
                pending && 'opacity-60'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{p.name}</span>
                {isCurrent && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm font-medium">{formatPrice(p.monthly_price_baht)}</p>
              {p.description && (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              )}
              <div className="mt-auto pt-2 grid grid-cols-3 gap-1 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">สินค้า</div>
                  <div className="font-medium tabular-nums">{formatLimit(p.max_products)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">ผู้ใช้</div>
                  <div className="font-medium tabular-nums">{formatLimit(p.max_users)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">สาขา</div>
                  <div className="font-medium tabular-nums">{formatLimit(p.max_branches)}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        การเปลี่ยนแพ็กเกจมีผลทันทีและบังคับใช้ขีดจำกัดสินค้า/ผู้ใช้/สาขาของแพ็กเกจใหม่
      </p>
    </div>
  )
}

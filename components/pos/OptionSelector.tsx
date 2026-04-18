'use client'

import { cn } from '@/lib/utils'
import { formatBaht } from '@/lib/format'
import type { OptionGroupWithOptions, SelectedOption } from '@/types/database'

type Props = {
  groups:   OptionGroupWithOptions[]
  selected: Record<string, SelectedOption[]>  // groupId → selections
  onChange: (groupId: string, selections: SelectedOption[]) => void
}

export function OptionSelector({ groups, selected, onChange }: Props) {
  if (!groups.length) return null

  function toggle(group: OptionGroupWithOptions, opt: OptionGroupWithOptions['options'][0]) {
    const current = selected[group.id] ?? []
    const sel: SelectedOption = {
      group_id:          group.id,
      group_name:        group.name,
      option_id:         opt.id,
      option_name:       opt.name,
      price_delta:       opt.price_delta,
      linked_product_id: opt.linked_product_id ?? null,
    }

    if (group.multi_select) {
      const exists = current.some((s) => s.option_id === opt.id)
      onChange(group.id, exists
        ? current.filter((s) => s.option_id !== opt.id)
        : [...current, sel]
      )
    } else {
      // single-select: selecting same → deselect (unless required)
      const already = current[0]?.option_id === opt.id
      onChange(group.id, already && !group.required ? [] : [sel])
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const picks = selected[group.id] ?? []
        return (
          <div key={group.id}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[13px] font-semibold">{group.name}</span>
              {group.required && (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  จำเป็น
                </span>
              )}
              {group.multi_select && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  เลือกได้หลายอย่าง
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => {
                const active = picks.some((s) => s.option_id === opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(group, opt)}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/50'
                    )}
                  >
                    {opt.name}
                    {opt.price_delta !== 0 && (
                      <span className={cn('ml-1', active ? 'opacity-80' : 'text-muted-foreground')}>
                        {opt.price_delta > 0 ? '+' : ''}{formatBaht(opt.price_delta)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

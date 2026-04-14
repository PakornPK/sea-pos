'use client'

import { useState } from 'react'
import { MapPin, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Branch } from '@/types/database'

type Props = {
  branches:           Branch[]
  initialBranchIds?:  string[]
  initialDefaultId?:  string | null
  disabled?:          boolean
}

/**
 * Multi-select for branch assignment. Renders hidden `branch_ids` and
 * `default_branch_id` form fields so it drops straight into any <form>.
 * Enforces: if the current default is deselected, promote the first
 * remaining selection to default.
 */
export function BranchMultiSelect({
  branches, initialBranchIds = [], initialDefaultId = null, disabled = false,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialBranchIds))
  const [defaultId, setDefaultId] = useState<string | null>(initialDefaultId)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (defaultId === id) {
          const first = Array.from(next)[0] ?? null
          setDefaultId(first)
        }
      } else {
        next.add(id)
        if (!defaultId) setDefaultId(id)
      }
      return next
    })
  }

  function setDefault(id: string) {
    if (!selected.has(id)) {
      setSelected((prev) => new Set(prev).add(id))
    }
    setDefaultId(id)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {branches.length === 0 && (
          <p className="text-xs text-muted-foreground">
            ยังไม่มีสาขา กรุณาสร้างสาขาก่อนที่หน้า &quot;สาขา&quot;
          </p>
        )}
        {branches.map((b) => {
          const isSel = selected.has(b.id)
          const isDef = defaultId === b.id
          return (
            <div
              key={b.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
                isSel ? 'border-primary bg-primary/5' : 'bg-muted/20',
                disabled && 'opacity-60'
              )}
            >
              <label className="flex flex-1 items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(b.id)}
                  disabled={disabled}
                  className="h-4 w-4 cursor-pointer"
                />
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{b.name}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                  {b.code}
                </code>
              </label>
              {isSel && (
                <button
                  type="button"
                  onClick={() => setDefault(b.id)}
                  disabled={disabled}
                  title="ตั้งเป็นสาขาเริ่มต้น"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                    isDef
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Star className={cn('h-3 w-3', isDef && 'fill-current')} />
                  {isDef ? 'เริ่มต้น' : 'ตั้งเริ่มต้น'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Hidden form fields — these are what the server action reads. */}
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="branch_ids" value={id} />
      ))}
      {defaultId && <input type="hidden" name="default_branch_id" value={defaultId} />}
    </div>
  )
}

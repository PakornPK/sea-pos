'use client'

import { useTransition } from 'react'
import { MapPin, ChevronDown, Loader2 } from 'lucide-react'
import { setActiveBranch } from '@/lib/actions/branches'
import type { Branch } from '@/types/database'

type Props = {
  branches: Branch[]
  active:   Branch | null
}

/**
 * Branch switcher dropdown. Hidden when a user has only one branch —
 * cashiers stay locked to where they're standing.
 */
export function BranchPicker({ branches, active }: Props) {
  const [pending, startTransition] = useTransition()

  if (branches.length <= 1) {
    if (!active) return null
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl ring-1 ring-border/70 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {active.name}
      </span>
    )
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    if (!next || next === active?.id) return
    startTransition(async () => {
      await setActiveBranch(next)
      // Full reload — branch switch affects server auth headers, active
      // branch badges, paginated lists, dashboard widgets, and Suspense
      // boundaries keyed on searchParams. router.refresh() doesn't blow
      // all of those caches reliably, so we force a clean re-request.
      window.location.reload()
    })
  }

  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-xl ring-1 ring-border/70 bg-background px-2 py-1 text-xs hover:border-primary/50">
      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={active?.id ?? ''}
        onChange={onChange}
        disabled={pending}
        className="appearance-none bg-transparent pr-5 outline-none cursor-pointer disabled:cursor-not-allowed"
      >
        {!active && <option value="" disabled>— เลือกสาขา —</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.code})
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="absolute right-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <ChevronDown className="absolute right-1.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      )}
    </label>
  )
}

'use client'

import { useTransition } from 'react'
import { MapPin, ChevronDown, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-client'
import type { Branch } from '@/types/database'

type Props = {
  branches: Branch[]
  active:   Branch | null
}

export function BranchPicker({ branches, active }: Props) {
  const { setActiveBranch } = useAuth()
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
    startTransition(() => {
      setActiveBranch(next)
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

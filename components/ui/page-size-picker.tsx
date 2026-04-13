'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'

type Props = {
  currentSize: number
}

/**
 * A compact select that changes the pageSize URL param and resets to page 1.
 * Preserves all other query params. Uses native <select> for zero JS overhead
 * and consistent behaviour across browsers.
 */
export function PageSizePicker({ currentSize }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = PAGE_SIZE_OPTIONS.includes(currentSize) ? currentSize : 20

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', String(next))
    params.set('page', '1') // always reset to first page on size change
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">ต่อหน้า:</span>
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {PAGE_SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </label>
  )
}

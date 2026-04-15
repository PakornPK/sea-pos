'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'
import { NativeSelect } from '@/components/ui/native-select'

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
    <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="hidden sm:inline">ต่อหน้า:</span>
      <NativeSelect
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="h-8 w-20 text-[12px] tabular-nums rounded-lg px-2 pr-6"
      >
        {PAGE_SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </NativeSelect>
    </label>
  )
}

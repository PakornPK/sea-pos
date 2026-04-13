'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * URL-synced search field. Typing updates `?q=…&page=1` after a short
 * debounce so the server-side query runs with the new term. Clears take
 * effect instantly.
 */
export function CustomerSearch({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Keep state in sync if the URL changes externally (e.g. user hits back).
  useEffect(() => { setValue(initial) }, [initial])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (value === (searchParams.get('q') ?? '')) return
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set('q', value.trim())
      else params.delete('q')
      params.set('page', '1')    // reset to first page on new search
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    }, 300)
    return () => clearTimeout(handle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="ค้นหา ชื่อ เบอร์ อีเมล..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-8"
        disabled={pending}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="ล้างการค้นหา"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

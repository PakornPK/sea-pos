'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Preset = { label: string; days: number }

const PRESETS: Preset[] = [
  { label: '7 วัน',  days: 7 },
  { label: '30 วัน', days: 30 },
  { label: '90 วัน', days: 90 },
]

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (n - 1))
  return isoDate(d)
}

type Props = {
  currentStart: string
  currentEnd: string
  activePreset: number | null
}

export function DateRangePicker({ currentStart, currentEnd, activePreset }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [start, setStart] = useState(currentStart)
  const [end, setEnd] = useState(currentEnd)

  function applyRange(nextStart: string, nextEnd: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('start', nextStart)
    params.set('end', nextEnd)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function applyPreset(days: number) {
    const nextStart = daysAgoIso(days)
    const nextEnd = isoDate(new Date())
    setStart(nextStart)
    setEnd(nextEnd)
    applyRange(nextStart, nextEnd)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-md border bg-card p-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            disabled={pending}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              activePreset === p.days
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          max={end}
          className="h-7 w-36 border-0 px-1 py-0 text-xs shadow-none focus-visible:ring-0"
        />
        <span className="text-xs text-muted-foreground">ถึง</span>
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          min={start}
          max={isoDate(new Date())}
          className="h-7 w-36 border-0 px-1 py-0 text-xs shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => applyRange(start, end)}
          disabled={pending || !start || !end}
          className="h-7 text-xs"
        >
          ใช้
        </Button>
      </div>
    </div>
  )
}

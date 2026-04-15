import { cn } from '@/lib/utils'

type Props = {
  label: string
  current: number
  limit: number | null
  unit: string
}

/**
 * Visual usage indicator: "X / Y <unit>" with a progress bar.
 * When `limit` is null (enterprise / unlimited plan), shows ∞.
 */
export function UsageCard({ label, current, limit, unit }: Props) {
  const unlimited = limit === null
  const ratio = unlimited ? 0 : limit > 0 ? Math.min(1, current / limit) : 1
  const pct = Math.round(ratio * 100)
  const reached = !unlimited && current >= limit
  const warning = !unlimited && ratio >= 0.8 && !reached

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {reached && (
          <span className="text-xs font-medium text-destructive">ใช้เต็มแล้ว</span>
        )}
        {warning && (
          <span className="text-xs font-medium text-amber-600">ใกล้เต็ม</span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{current.toLocaleString('th-TH')}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-base text-muted-foreground tabular-nums">
          {unlimited ? '∞' : limit.toLocaleString('th-TH')}
        </span>
        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
      </div>
      {!unlimited && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all',
              reached ? 'bg-destructive' : warning ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'purple'
  className?: string
}

const COLOR_MAP = {
  blue:   'bg-primary/10 text-primary',
  green:  'bg-[oklch(0.719_0.188_145)]/15 text-[oklch(0.579_0.188_145)]',
  orange: 'bg-[oklch(0.704_0.170_65)]/15 text-[oklch(0.574_0.170_65)]',
  purple: 'bg-[oklch(0.683_0.180_300)]/15 text-[oklch(0.543_0.180_300)]',
}

export function KpiCard({ label, value, hint, icon: Icon, color = 'blue', className }: Props) {
  return (
    <div className={cn(
      'flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/[0.05]',
      className
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', COLOR_MAP[color])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="text-[28px] font-bold tabular-nums tracking-tight leading-none">{value}</p>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

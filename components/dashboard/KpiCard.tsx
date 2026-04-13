import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  className?: string
}

export function KpiCard({ label, value, hint, icon: Icon, className }: Props) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold tabular-nums mt-2">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          'h-9 w-full appearance-none rounded-xl border border-input bg-card px-3 pr-8 py-1.5 text-[14px] transition-all outline-none',
          'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 focus-visible:shadow-sm',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40',
          'dark:bg-input/30 dark:disabled:bg-input/80',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
    </div>
  )
}

export { NativeSelect }

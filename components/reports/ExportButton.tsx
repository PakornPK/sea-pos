'use client'

import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Kind = 'sales' | 'stock-movements' | 'inventory' | 'vat'

type Props = {
  kind: Kind
  start?: string
  end?: string
  branchId?: string | null
  label?: string
}

export function ExportButton({
  kind, start, end, branchId, label = 'ดาวน์โหลด CSV',
}: Props) {
  const params = new URLSearchParams({ kind })
  if (start)    params.set('start', start)
  if (end)      params.set('end', end)
  if (branchId) params.set('branch', branchId)

  return (
    <a
      href={`/api/reports/export?${params.toString()}`}
      download
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'gap-1.5'
      )}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}

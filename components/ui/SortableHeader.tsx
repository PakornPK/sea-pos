'use client'

import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/lib/sort'

type BaseProps = {
  label: string
  active: boolean
  dir: SortDir
  className?: string
}

type Props =
  | (BaseProps & { href: string; onClick?: undefined })
  | (BaseProps & { onClick: () => void; href?: undefined })

export function SortableHeader({ label, active, dir, className, href, onClick }: Props) {
  const Icon = active
    ? dir === 'asc' ? ChevronUp : ChevronDown
    : ChevronsUpDown

  const classes = cn(
    'inline-flex items-center gap-1 cursor-pointer select-none transition-colors whitespace-nowrap',
    active ? 'text-foreground' : 'hover:text-foreground',
    className,
  )

  const inner = (
    <>
      {label}
      <Icon className={cn('h-3 w-3 shrink-0', !active && 'opacity-40')} />
    </>
  )

  if (href !== undefined) {
    return <Link href={href} className={classes}>{inner}</Link>
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  )
}

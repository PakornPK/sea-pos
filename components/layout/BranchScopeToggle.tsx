import Link from 'next/link'
import { MapPin, Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  basePath:          string
  searchParams:      Record<string, string | undefined>
  isAllBranches:     boolean
  activeBranchLabel: string | null
}

/**
 * Admin-only scope switch for list views. Two pill buttons:
 *   [สาขาของฉัน]  [ทุกสาขา]
 * One is always highlighted. Clicking updates the `?branch=` param.
 */
export function BranchScopeToggle({
  basePath, searchParams, isAllBranches, activeBranchLabel,
}: Props) {
  const build = (next: 'all' | 'active') => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && k !== 'branch' && k !== 'page') sp.set(k, String(v))
    }
    if (next === 'all') sp.set('branch', 'all')
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const pill =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-medium transition-all'
  const active = 'bg-card shadow-sm text-foreground'
  const idle   = 'text-muted-foreground hover:text-foreground'

  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted/70 p-0.5 shrink-0">
      <Link
        href={build('active')}
        className={cn(pill, !isAllBranches ? active : idle)}
      >
        <MapPin className="h-3 w-3" />
        {activeBranchLabel ?? 'สาขาของฉัน'}
      </Link>
      <Link
        href={build('all')}
        className={cn(pill, isAllBranches ? active : idle)}
      >
        <Globe2 className="h-3 w-3" />
        ทุกสาขา
      </Link>
    </div>
  )
}

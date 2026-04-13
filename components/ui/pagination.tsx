import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

type Props = {
  /** The path segment + any pre-existing search params (no trailing ?). */
  basePath: string
  /** Current request's search params, so we preserve filters/search. */
  searchParams: Record<string, string | string[] | undefined>
  page:       number
  pageSize:   number
  totalCount: number
  totalPages: number
}

function buildHref(
  basePath: string,
  sp: Record<string, string | string[] | undefined>,
  page: number
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || k === 'page') continue
    if (Array.isArray(v)) v.forEach((x) => params.append(k, x))
    else params.set(k, v)
  }
  params.set('page', String(page))
  return `${basePath}?${params.toString()}`
}

/** Returns page numbers to show, with -1 meaning ellipsis. */
function getVisiblePages(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: number[] = [1]
  const left  = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)

  if (left > 2) pages.push(-1)
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push(-1)

  pages.push(total)
  return pages
}

export function Pagination({
  basePath, searchParams, page, pageSize, totalCount, totalPages,
}: Props) {
  if (totalCount === 0) return null

  const firstRow = (page - 1) * pageSize + 1
  const lastRow  = Math.min(page * pageSize, totalCount)
  const pages    = getVisiblePages(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        แสดง <span className="font-medium text-foreground">{firstRow.toLocaleString('th-TH')}</span>
        {firstRow !== lastRow && (
          <>
            {' – '}
            <span className="font-medium text-foreground">{lastRow.toLocaleString('th-TH')}</span>
          </>
        )}{' '}จาก{' '}
        <span className="font-medium text-foreground">{totalCount.toLocaleString('th-TH')}</span>{' '}รายการ
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageLink
            href={page > 1 ? buildHref(basePath, searchParams, page - 1) : null}
            aria-label="ก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </PageLink>

          {pages.map((n, i) =>
            n === -1 ? (
              <span key={`ell-${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <PageLink
                key={n}
                href={buildHref(basePath, searchParams, n)}
                active={n === page}
              >
                {n}
              </PageLink>
            )
          )}

          <PageLink
            href={page < totalPages ? buildHref(basePath, searchParams, page + 1) : null}
            aria-label="ถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </PageLink>
        </div>
      )}
    </div>
  )
}

function PageLink({
  href, active, children, ...rest
}: {
  href: string | null
  active?: boolean
  children: React.ReactNode
} & Omit<React.ComponentProps<'a'>, 'href'>) {
  const cls = cn(
    buttonVariants({ variant: active ? 'default' : 'outline', size: 'sm' }),
    'h-8 min-w-8 px-2',
    href === null && 'pointer-events-none opacity-50'
  )
  if (href === null) {
    return <span className={cls} aria-disabled="true">{children}</span>
  }
  return <Link href={href} className={cls} {...rest}>{children}</Link>
}

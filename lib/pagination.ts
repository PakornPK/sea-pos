/**
 * Server-side pagination utility.
 *
 * Every paginated list page reads { page, pageSize } from its URL search
 * params with this helper, passes them to the repo's `*Paginated` method,
 * and hands the `<Pagination>` component the result + the current params.
 *
 * Design notes:
 *   - Offset-based (?page=N). Simpler + URL-shareable. Cursor pagination
 *     would be more efficient for very large tables but our POS domain
 *     tables stay in the low thousands.
 *   - pageSize is URL-visible so power users can switch to 100/page if
 *     they want to scroll less. Clamped to sane range.
 *   - All params are preserved when navigating pages — this is critical
 *     so pagination + filters + search all compose cleanly.
 */

export type PageParams = {
  page:     number
  pageSize: number
}

export type Paginated<T> = {
  rows:       T[]
  totalCount: number
  page:       number
  pageSize:   number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 && Number.isInteger(n) ? n : fallback
}

export function parsePageParams(
  sp: { page?: string; pageSize?: string },
  defaults: Partial<PageParams> = {}
): PageParams {
  const page = toPositiveInt(sp.page, defaults.page ?? 1)
  let pageSize = toPositiveInt(sp.pageSize, defaults.pageSize ?? DEFAULT_PAGE_SIZE)
  if (!PAGE_SIZE_OPTIONS.includes(pageSize)) pageSize = DEFAULT_PAGE_SIZE
  return { page, pageSize }
}

/**
 * Supabase `.range(from, to)` uses inclusive 0-indexed offsets.
 * Example: page=1 pageSize=20 → range(0, 19). page=3 pageSize=20 → range(40, 59).
 */
export function toSupabaseRange(p: PageParams): { from: number; to: number } {
  const from = (p.page - 1) * p.pageSize
  return { from, to: from + p.pageSize - 1 }
}

export function packPaginated<T>(
  rows: T[],
  totalCount: number,
  p: PageParams
): Paginated<T> {
  return {
    rows,
    totalCount,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / p.pageSize)),
  }
}

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS }

export type SortDir = 'asc' | 'desc'

/** Parse sort column + direction from URL search params. */
export function parseSort<T extends string>(
  params: Record<string, string | undefined>,
  defaultCol: T,
  defaultDir: SortDir = 'asc',
): { col: T; dir: SortDir } {
  const col = (params.sort ?? defaultCol) as T
  const dir: SortDir =
    params.dir === 'asc' ? 'asc' :
    params.dir === 'desc' ? 'desc' :
    defaultDir
  return { col, dir }
}

/**
 * Build a URL that toggles sort on `col`.
 * - Same col → flip direction
 * - New col  → default asc, reset page to 1
 * Preserves all other search params (except sort, dir, page).
 */
export function sortToggleHref(
  basePath: string,
  currentParams: Record<string, string | undefined>,
  col: string,
  currentSort: string,
  currentDir: SortDir,
): string {
  const dir: SortDir = currentSort === col
    ? (currentDir === 'asc' ? 'desc' : 'asc')
    : 'asc'
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(currentParams)) {
    if (v !== undefined && k !== 'sort' && k !== 'dir' && k !== 'page') p.set(k, v)
  }
  p.set('sort', col)
  p.set('dir', dir)
  return `${basePath}?${p.toString()}`
}

/** Sort an array in-place (returns new array). Handles null/undefined gracefully. */
export function sortRows<T>(rows: T[], col: keyof T, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = a[col]
    const bv = b[col]
    if (av == null && bv == null) return 0
    if (av == null) return dir === 'asc' ? 1 : -1
    if (bv == null) return dir === 'asc' ? -1 : 1
    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv, 'th')
      return dir === 'asc' ? cmp : -cmp
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

/**
 * Human-readable receipt number. If a branch code is passed, it prefixes
 * the number so cashiers and customers can tell branches apart (B01-00042).
 * Falls back to the legacy `REC-` prefix when no branch is available.
 */
export function formatReceiptNo(
  no: number | null | undefined,
  branchCode?: string | null,
): string {
  if (!no) return '—'
  const padded = String(no).padStart(5, '0')
  return branchCode ? `${branchCode}-${padded}` : `REC-${padded}`
}

export function formatPoNo(no: number | null | undefined): string {
  if (!no) return '—'
  return `PO-${String(no).padStart(5, '0')}`
}

/** Thai date (short) / datetime (short date + short time). */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  return new Date(input).toLocaleDateString('th-TH')
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—'
  return new Date(input).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** ฿ amount with 2 decimals, Thai grouping. */
export function formatBaht(n: number | string | null | undefined): string {
  const num = Number(n ?? 0)
  return `฿${num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

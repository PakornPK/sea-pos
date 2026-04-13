/** Human-readable receipt / PO numbers. */
export function formatReceiptNo(no: number | null | undefined): string {
  if (!no) return '—'
  return `REC-${String(no).padStart(5, '0')}`
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

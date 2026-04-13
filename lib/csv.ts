/**
 * Minimal, RFC-4180-correct CSV encoder. Quotes fields that contain commas,
 * quotes, or newlines. Doubles embedded quotes. Always emits CRLF line
 * terminators. Prefixes with UTF-8 BOM so Excel opens Thai characters
 * correctly.
 */

const BOM = '\uFEFF'

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'string' ? value : String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines: string[] = []
  lines.push(headers.map(escapeField).join(','))
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','))
  }
  return BOM + lines.join('\r\n') + '\r\n'
}

/** Sanitize a string for safe use as a filename segment. */
export function csvFilename(...parts: string[]): string {
  const safe = parts
    .filter(Boolean)
    .map((p) => p.replace(/[^\w\-.]/g, '_'))
    .join('_')
  return `${safe}.csv`
}

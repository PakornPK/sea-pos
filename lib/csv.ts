/**
 * Minimal, RFC-4180-correct CSV encoder. Quotes fields that contain commas,
 * quotes, or newlines. Doubles embedded quotes. Always emits CRLF line
 * terminators. Prefixes with UTF-8 BOM so Excel opens Thai characters
 * correctly.
 *
 * Also provides a RFC-4180 parser that handles BOM, CRLF, and quoted fields.
 */

// ─── Parser ──────────────────────────────────────────────────────────────────

export type CsvParseResult = {
  headers: string[]
  rows: Record<string, string>[]
  error?: string
}

/**
 * Normalize a column key for fuzzy header matching.
 * Lowercases and strips all spaces, hyphens, and underscores so that
 * "Product Name", "product-name", and "product_name" all map to "productname".
 */
export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]/g, '')
}

/**
 * Parse CSV text into a structured result.
 * Handles:
 *   - UTF-8 BOM (strips \uFEFF from start)
 *   - CRLF and LF line endings
 *   - RFC-4180 quoted fields (commas and quotes inside quotes)
 *   - Empty trailing lines
 */
export function parseCSV(text: string): CsvParseResult {
  // Strip BOM
  const stripped = text.startsWith('\uFEFF') ? text.slice(1) : text

  if (!stripped.trim()) {
    return { headers: [], rows: [], error: 'ไฟล์ว่างเปล่า' }
  }

  // Tokenise the entire file character-by-character (proper RFC-4180).
  const records: string[][] = []
  let currentRecord: string[] = []
  let field = ''
  let inQuotes = false
  const len = stripped.length

  for (let i = 0; i < len; i++) {
    const ch = stripped[i]

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead for doubled-quote escape.
        if (i + 1 < len && stripped[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        currentRecord.push(field)
        field = ''
      } else if (ch === '\r') {
        // CRLF: consume the \n if present
        if (i + 1 < len && stripped[i + 1] === '\n') i++
        currentRecord.push(field)
        field = ''
        records.push(currentRecord)
        currentRecord = []
      } else if (ch === '\n') {
        currentRecord.push(field)
        field = ''
        records.push(currentRecord)
        currentRecord = []
      } else {
        field += ch
      }
    }
  }

  // Push final field / record (no trailing newline case).
  currentRecord.push(field)
  if (currentRecord.some((f) => f !== '')) {
    records.push(currentRecord)
  }

  if (records.length === 0) {
    return { headers: [], rows: [], error: 'ไม่พบข้อมูลในไฟล์' }
  }

  const headers = records[0].map((h) => h.trim())

  if (headers.length === 0 || headers.every((h) => h === '')) {
    return { headers: [], rows: [], error: 'ไม่พบหัวคอลัมน์' }
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < records.length; r++) {
    const record = records[r]
    // Skip completely empty rows
    if (record.every((f) => f.trim() === '')) continue
    const row: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (record[c] ?? '').trim()
    }
    rows.push(row)
  }

  return { headers, rows }
}

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

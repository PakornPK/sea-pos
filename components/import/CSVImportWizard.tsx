'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { parseCSV, normalizeKey } from '@/lib/csv'
import {
  importProducts,
  importCustomers,
  importMembers,
  type ImportResult,
} from '@/lib/actions/import'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImportType = 'products' | 'customers' | 'members'

type Step = 'upload' | 'preview' | 'done'
type MappedRow = Record<string, string>

type FieldDef = {
  key: string
  label: string
  required: boolean
  aliases: string[]
}

type ImportConfig = {
  title: string
  path: string
  fields: FieldDef[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const IMPORT_CONFIG: Record<ImportType, ImportConfig> = {
  products: {
    title: 'นำเข้าสินค้า',
    path: '/inventory',
    fields: [
      {
        key: 'name',
        label: 'ชื่อสินค้า',
        required: true,
        aliases: ['name', 'ชื่อ', 'ชื่อสินค้า', 'product', 'item', 'productname', 'itemname'],
      },
      {
        key: 'sku',
        label: 'SKU',
        required: false,
        aliases: ['sku', 'รหัสสินค้า', 'code', 'productcode'],
      },
      {
        key: 'barcode',
        label: 'บาร์โค้ด',
        required: false,
        aliases: ['barcode', 'บาร์โค้ด', 'ean', 'upc', 'ean13'],
      },
      {
        key: 'price',
        label: 'ราคาขาย',
        required: false,
        aliases: ['price', 'ราคา', 'ราคาขาย', 'sellingprice', 'saleprice'],
      },
      {
        key: 'cost',
        label: 'ต้นทุน',
        required: false,
        aliases: ['cost', 'ต้นทุน', 'costprice', 'purchaseprice'],
      },
      {
        key: 'min_stock',
        label: 'สต๊อกขั้นต่ำ',
        required: false,
        aliases: ['min_stock', 'minstock', 'minimum_stock', 'minimumstock', 'minqty'],
      },
      {
        key: 'category',
        label: 'หมวดหมู่',
        required: false,
        aliases: ['category', 'หมวดหมู่', 'cat', 'categoryname'],
      },
      {
        key: 'track_stock',
        label: 'ติดตามสต๊อก',
        required: false,
        aliases: ['track_stock', 'trackstock', 'tracking', 'stock'],
      },
    ],
  },
  customers: {
    title: 'นำเข้าลูกค้า',
    path: '/customers',
    fields: [
      {
        key: 'name',
        label: 'ชื่อลูกค้า',
        required: true,
        aliases: ['name', 'ชื่อ', 'ชื่อลูกค้า', 'customername', 'fullname'],
      },
      {
        key: 'phone',
        label: 'เบอร์โทรศัพท์',
        required: false,
        aliases: ['phone', 'เบอร์โทร', 'เบอร์', 'tel', 'mobile', 'phonenumber', 'telephone'],
      },
      {
        key: 'email',
        label: 'อีเมล',
        required: false,
        aliases: ['email', 'อีเมล', 'emailaddress', 'mail'],
      },
      {
        key: 'address',
        label: 'ที่อยู่',
        required: false,
        aliases: ['address', 'ที่อยู่', 'addr', 'location'],
      },
    ],
  },
  members: {
    title: 'นำเข้าสมาชิก',
    path: '/members',
    fields: [
      {
        key: 'name',
        label: 'ชื่อสมาชิก',
        required: true,
        aliases: ['name', 'ชื่อ', 'ชื่อสมาชิก', 'membername', 'fullname'],
      },
      {
        key: 'phone',
        label: 'เบอร์โทรศัพท์',
        required: false,
        aliases: ['phone', 'เบอร์โทร', 'เบอร์', 'tel', 'mobile', 'phonenumber', 'telephone'],
      },
      {
        key: 'email',
        label: 'อีเมล',
        required: false,
        aliases: ['email', 'อีเมล', 'emailaddress', 'mail'],
      },
      {
        key: 'address',
        label: 'ที่อยู่',
        required: false,
        aliases: ['address', 'ที่อยู่', 'addr', 'location'],
      },
    ],
  },
}

// ─── Numeric field keys ───────────────────────────────────────────────────────

const NUMERIC_FIELDS = new Set(['price', 'cost', 'min_stock'])

// ─── Example rows for template download ──────────────────────────────────────

const TEMPLATE_EXAMPLES: Record<ImportType, Record<string, string>> = {
  products: {
    name: 'น้ำดื่มขนาด 1.5L',
    sku: 'WTR-001',
    barcode: '8851234567890',
    price: '20',
    cost: '12',
    min_stock: '10',
    category: 'เครื่องดื่ม',
    track_stock: 'true',
  },
  customers: {
    name: 'สมชาย ใจดี',
    phone: '0812345678',
    email: 'somchai@example.com',
    address: '123 ถ.สุขุมวิท กรุงเทพฯ',
  },
  members: {
    name: 'สมหญิง มีสุข',
    phone: '0898765432',
    email: 'somying@example.com',
    address: '456 ถ.เพชรบุรี กรุงเทพฯ',
  },
}

// ─── Auto-mapping ─────────────────────────────────────────────────────────────

function buildMapping(
  headers: string[],
  fields: FieldDef[],
): Record<string, string | null> {
  const mapping: Record<string, string | null> = {}
  for (const field of fields) {
    const normalizedAliases = field.aliases.map(normalizeKey)
    let matched: string | null = null
    for (const header of headers) {
      const normalizedHeader = normalizeKey(header)
      if (normalizedAliases.includes(normalizedHeader)) {
        matched = header
        break
      }
    }
    mapping[field.key] = matched
  }
  return mapping
}

// ─── Map CSV rows to field keys ───────────────────────────────────────────────

function mapRows(
  csvRows: Record<string, string>[],
  mapping: Record<string, string | null>,
): MappedRow[] {
  return csvRows.map((csvRow) => {
    const mapped: MappedRow = {}
    for (const [fieldKey, csvHeader] of Object.entries(mapping)) {
      mapped[fieldKey] = csvHeader ? (csvRow[csvHeader] ?? '') : ''
    }
    return mapped
  })
}

// ─── Client-side validation ───────────────────────────────────────────────────

function validateRows(
  rows: MappedRow[],
  fields: FieldDef[],
): string[] {
  return rows.map((row) => {
    for (const field of fields) {
      const val = row[field.key] ?? ''
      if (field.required && !val.trim()) {
        return `"${field.label}" ไม่สามารถเว้นว่างได้`
      }
      if (NUMERIC_FIELDS.has(field.key) && val.trim() !== '') {
        const n = Number(val.trim())
        if (!Number.isFinite(n) || n < 0) {
          return `"${field.label}" ต้องเป็นตัวเลขที่ไม่ติดลบ`
        }
      }
    }
    return ''
  })
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate(type: ImportType) {
  const config = IMPORT_CONFIG[type]
  const headers = config.fields.map((f) => f.key)
  const example = TEMPLATE_EXAMPLES[type]
  const exampleRow = headers.map((h) => example[h] ?? '')

  const escapeField = (value: string): string => {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const BOM = '\uFEFF'
  const headerLine = headers.map(escapeField).join(',')
  const dataLine = exampleRow.map(escapeField).join(',')
  const csv = BOM + headerLine + '\r\n' + dataLine + '\r\n'

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `template_${type}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  type: ImportType
  open: boolean
  onClose: () => void
}

export function CSVImportWizard({ type, open, onClose }: Props) {
  const config = IMPORT_CONFIG[type]

  const [step, setStep] = useState<Step>('upload')
  const [filename, setFilename] = useState('')
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep('upload')
    setFilename('')
    setMappedRows([])
    setValidationErrors([])
    setParseError(null)
    setImporting(false)
    setResult(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const processFile = useCallback(
    (file: File) => {
      setParseError(null)

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setParseError('กรุณาเลือกไฟล์ .csv เท่านั้น')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setParseError('ไฟล์มีขนาดเกิน 5MB กรุณาแบ่งไฟล์แล้วนำเข้าทีละส่วน')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const parsed = parseCSV(text)

        if (parsed.error || parsed.rows.length === 0) {
          setParseError(parsed.error ?? 'ไม่พบข้อมูลในไฟล์')
          return
        }

        const mapping = buildMapping(parsed.headers, config.fields)
        const rows = mapRows(parsed.rows, mapping)
        const errors = validateRows(rows, config.fields)

        setFilename(file.name)
        setMappedRows(rows)
        setValidationErrors(errors)
        setStep('preview')
      }
      reader.onerror = () => {
        setParseError('ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่')
      }
      reader.readAsText(file, 'utf-8')
    },
    [config.fields],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // Reset input value so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleImport = useCallback(async () => {
    const validRows = mappedRows.filter((_, i) => validationErrors[i] === '')

    if (validRows.length === 0) return

    setImporting(true)
    try {
      let importResult: ImportResult
      if (type === 'products') {
        importResult = await importProducts(validRows)
      } else if (type === 'customers') {
        importResult = await importCustomers(validRows)
      } else {
        importResult = await importMembers(validRows)
      }
      setResult(importResult)
      setStep('done')
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setImporting(false)
    }
  }, [mappedRows, validationErrors, type])

  const validCount = validationErrors.filter((e) => e === '').length
  const errorCount = validationErrors.filter((e) => e !== '').length

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'อัปโหลดไฟล์ CSV เพื่อนำเข้าข้อมูลจำนวนมากในคราวเดียว'}
            {step === 'preview' && `ตรวจสอบข้อมูลก่อนนำเข้า — พบ ${mappedRows.length} แถวในไฟล์`}
            {step === 'done' && 'การนำเข้าข้อมูลเสร็จสิ้น'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Upload step ── */}
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <div
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 transition-colors',
                'border-border/60 hover:border-primary/40 hover:bg-muted/30',
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-[14px] text-foreground">
                  ลากไฟล์ CSV มาวางที่นี่ หรือ{' '}
                  <span className="text-primary underline underline-offset-2">เลือกไฟล์</span>
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">.csv ไม่เกิน 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span>ดาวน์โหลดเทมเพลต:</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[13px]"
                onClick={() => downloadTemplate(type)}
              >
                template_{type}.csv
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {config.fields.map((field) => (
                <span
                  key={field.key}
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                    field.required
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {field.label}
                  {field.required && <span className="ml-0.5 text-primary">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Preview step ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted-foreground">{filename}</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 ring-green-500/20">
                {validCount} แถวพร้อมนำเข้า
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">
                  {errorCount} แถวมีข้อผิดพลาด
                </Badge>
              )}
            </div>

            {/* Scrollable preview table */}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center text-[12px]">#</TableHead>
                    {config.fields.map((field) => (
                      <TableHead key={field.key} className="text-[12px]">
                        {field.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-[12px] text-destructive">ข้อผิดพลาด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.map((row, i) => {
                    const hasError = validationErrors[i] !== ''
                    return (
                      <TableRow
                        key={i}
                        className={cn(hasError && 'bg-destructive/5')}
                      >
                        <TableCell className="text-center text-[12px] tabular-nums text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        {config.fields.map((field) => (
                          <TableCell key={field.key} className="max-w-[160px] truncate text-[13px]">
                            {row[field.key] || (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-[12px] text-destructive">
                          {validationErrors[i] || ''}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Done step ── */}
        {step === 'done' && result && (
          <div className="flex flex-col items-center gap-4 py-4">
            {result.imported > 0 ? (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            ) : (
              <AlertCircle className="h-12 w-12 text-destructive" />
            )}
            <div className="text-center">
              <p className="text-[16px] font-semibold">
                นำเข้าสำเร็จ {result.imported} รายการ
              </p>
              {result.failed.length > 0 && (
                <p className="mt-1 text-[13px] text-muted-foreground">
                  ไม่สำเร็จ {result.failed.length} รายการ
                </p>
              )}
            </div>

            {result.failed.length > 0 && (
              <div className="w-full">
                <p className="mb-2 text-[13px] font-medium text-destructive">รายการที่ล้มเหลว</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5">
                  {result.failed.map((f) => (
                    <div
                      key={f.index}
                      className="flex items-start gap-2 border-b border-destructive/10 px-3 py-2 last:border-b-0 text-[12px]"
                    >
                      <span className="shrink-0 font-mono text-muted-foreground">
                        แถว {f.index + 1}
                      </span>
                      <span className="text-destructive">{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              ยกเลิก
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload')
                  setParseError(null)
                }}
              >
                เลือกไฟล์ใหม่
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? 'กำลังนำเข้า...' : `นำเข้า ${validCount} แถว`}
              </Button>
            </>
          )}

          {step === 'done' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                ปิด
              </Button>
              <Button
                onClick={() => {
                  resetState()
                }}
              >
                นำเข้าเพิ่ม
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

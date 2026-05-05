'use client'

import { useTransition } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { analyticsRepo } from '@/lib/repositories'
import { toCsv, csvFilename } from '@/lib/csv'
import { sumBy, moneyStr } from '@/lib/money'
import { parseDateRange } from '@/lib/daterange'

type Kind = 'sales' | 'stock-movements' | 'inventory' | 'vat'

type Props = {
  kind: Kind
  start?: string
  end?: string
  branchId?: string | null
  label?: string
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({
  kind, start, end, branchId, label = 'ดาวน์โหลด CSV',
}: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        switch (kind) {
          case 'sales': {
            const r = parseDateRange({ start, end })
            const rows = await analyticsRepo.salesRowsByRange(r.startIso, r.endIso, { branchId: branchId ?? null })
            const body = toCsv(
              ['receipt_no', 'created_at', 'customer', 'payment_method', 'status',
               'subtotal_ex_vat', 'vat_amount', 'total_amount'],
              rows.map((s) => [
                `REC-${String(s.receipt_no).padStart(5, '0')}`,
                s.created_at,
                s.customer_name ?? 'walk-in',
                s.payment_method,
                s.status,
                moneyStr(s.subtotal_ex_vat),
                moneyStr(s.vat_amount),
                moneyStr(s.total_amount),
              ])
            )
            triggerDownload(body, csvFilename('sales', r.startDate, r.endDate))
            break
          }

          case 'vat': {
            const r = parseDateRange({ start, end })
            const [salesRows, poRows] = await Promise.all([
              analyticsRepo.salesRowsByRange(r.startIso, r.endIso, { branchId: branchId ?? null }),
              analyticsRepo.purchaseRowsByRange(r.startIso, r.endIso, { branchId: branchId ?? null }),
            ])
            const completedSales = salesRows.filter((s) => s.status === 'completed')
            const outNet   = sumBy(completedSales, (r) => r.subtotal_ex_vat)
            const outVat   = sumBy(completedSales, (r) => r.vat_amount)
            const outGross = sumBy(completedSales, (r) => r.total_amount)
            const inNet    = sumBy(poRows, (r) => r.subtotal_ex_vat)
            const inVat    = sumBy(poRows, (r) => r.vat_amount)
            const inGross  = sumBy(poRows, (r) => r.total_amount)
            const netVat   = Number((outVat - inVat).toFixed(2))
            const body = toCsv(
              ['section', 'doc_no', 'date', 'party', 'net', 'vat', 'gross'],
              [
                ...completedSales.map((s) => ['OUTPUT', `REC-${String(s.receipt_no).padStart(5, '0')}`, s.created_at, s.customer_name ?? 'walk-in', moneyStr(s.subtotal_ex_vat), moneyStr(s.vat_amount), moneyStr(s.total_amount)]),
                ['OUTPUT', 'TOTAL', '', '', moneyStr(outNet), moneyStr(outVat), moneyStr(outGross)],
                ...poRows.map((p) => ['INPUT', `PO-${String(p.po_no).padStart(5, '0')}`, p.received_at ?? '', p.supplier_name ?? '', moneyStr(p.subtotal_ex_vat), moneyStr(p.vat_amount), moneyStr(p.total_amount)]),
                ['INPUT', 'TOTAL', '', '', moneyStr(inNet), moneyStr(inVat), moneyStr(inGross)],
                ['NET', 'VAT_PAYABLE', '', '', '', moneyStr(netVat), ''],
              ]
            )
            triggerDownload(body, csvFilename('vat', r.startDate, r.endDate))
            break
          }

          case 'stock-movements': {
            const r = parseDateRange({ start, end })
            const rows = await analyticsRepo.stockMovements({ start: r.startIso, end: r.endIso, branchId: branchId ?? null, limit: 5000 })
            const body = toCsv(
              ['created_at', 'product', 'change', 'reason', 'user_id'],
              rows.map((m) => [m.created_at, m.product_name, m.change, m.reason ?? '', m.user_id ?? ''])
            )
            triggerDownload(body, csvFilename('stock-movements', r.startDate, r.endDate))
            break
          }

          case 'inventory': {
            const rows = await analyticsRepo.inventoryValueByCategory({ branchId: branchId ?? null })
            const body = toCsv(
              ['category', 'item_count', 'stock_value'],
              rows.map((r) => [r.category_name, r.item_count, moneyStr(r.stock_value)])
            )
            triggerDownload(body, csvFilename('inventory-value', new Date().toISOString().slice(0, 10)))
            break
          }
        }
      } catch (e) {
        console.error('Export failed:', e)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
    >
      {pending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      {label}
    </button>
  )
}

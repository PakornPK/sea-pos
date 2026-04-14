import { NextResponse, type NextRequest } from 'next/server'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo } from '@/lib/repositories'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { parseDateRange } from '@/lib/daterange'
import { toCsv, csvFilename } from '@/lib/csv'
import { sumBy, moneyStr } from '@/lib/money'

/**
 * CSV export endpoint for reports.
 *   GET /api/reports/export?kind=sales&start=YYYY-MM-DD&end=YYYY-MM-DD
 *   GET /api/reports/export?kind=stock-movements&start=...&end=...
 *   GET /api/reports/export?kind=inventory
 *
 * Protected by requirePageRole: admin + manager only. Anyone else gets 401.
 */

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  let me
  try {
    ({ me } = await requirePageRole(['admin', 'manager']))
  } catch {
    return jsonError(401, 'Unauthorized')
  }

  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') ?? 'sales'
  const branchId = resolveBranchFilter(me, searchParams.get('branch') ?? undefined)

  try {
    switch (kind) {
      case 'sales': {
        const r = parseDateRange({
          start: searchParams.get('start') ?? undefined,
          end: searchParams.get('end') ?? undefined,
        })
        const rows = await analyticsRepo.salesRowsByRange(r.startIso, r.endIso, { branchId })
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
        return csvResponse(body, csvFilename('sales', r.startDate, r.endDate))
      }

      case 'vat': {
        const r = parseDateRange({
          start: searchParams.get('start') ?? undefined,
          end: searchParams.get('end') ?? undefined,
        })
        // One row per completed sale, plus a trailing totals row the accountant
        // can paste straight into ภ.พ.30.
        const rows = await analyticsRepo.salesRowsByRange(r.startIso, r.endIso, { branchId })
        const completed = rows.filter((s) => s.status === 'completed')
        const totalNet   = sumBy(completed, (r) => r.subtotal_ex_vat)
        const totalVat   = sumBy(completed, (r) => r.vat_amount)
        const totalGross = sumBy(completed, (r) => r.total_amount)

        const body = toCsv(
          ['receipt_no', 'created_at', 'customer', 'net_sales', 'vat_output', 'gross_sales'],
          [
            ...completed.map((s) => [
              `REC-${String(s.receipt_no).padStart(5, '0')}`,
              s.created_at,
              s.customer_name ?? 'walk-in',
              moneyStr(s.subtotal_ex_vat),
              moneyStr(s.vat_amount),
              moneyStr(s.total_amount),
            ]),
            ['TOTAL', '', '', moneyStr(totalNet), moneyStr(totalVat), moneyStr(totalGross)],
          ]
        )
        return csvResponse(body, csvFilename('vat', r.startDate, r.endDate))
      }

      case 'stock-movements': {
        const r = parseDateRange({
          start: searchParams.get('start') ?? undefined,
          end: searchParams.get('end') ?? undefined,
        })
        const rows = await analyticsRepo.stockMovements({
          start: r.startIso,
          end: r.endIso,
          branchId,
          limit: 5000,
        })
        const body = toCsv(
          ['created_at', 'product', 'change', 'reason', 'user_id'],
          rows.map((m) => [
            m.created_at,
            m.product_name,
            m.change,
            m.reason ?? '',
            m.user_id ?? '',
          ])
        )
        return csvResponse(body, csvFilename('stock-movements', r.startDate, r.endDate))
      }

      case 'inventory': {
        const rows = await analyticsRepo.inventoryValueByCategory({ branchId })
        const body = toCsv(
          ['category', 'item_count', 'stock_value'],
          rows.map((r) => [r.category_name, r.item_count, moneyStr(r.stock_value)])
        )
        const today = new Date().toISOString().slice(0, 10)
        return csvResponse(body, csvFilename('inventory-value', today))
      }

      default:
        return jsonError(400, `Unknown kind: ${kind}`)
    }
  } catch (e) {
    return jsonError(500, e instanceof Error ? e.message : 'Internal error')
  }
}

function csvResponse(body: string, filename: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

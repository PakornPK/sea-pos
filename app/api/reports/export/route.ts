import { NextResponse, type NextRequest } from 'next/server'
import { requirePageRole } from '@/lib/auth'
import { analyticsRepo } from '@/lib/repositories'
import { resolveBranchFilter } from '@/lib/branch-filter'
import { parseDateRange } from '@/lib/daterange'
import { toCsv, csvFilename } from '@/lib/csv'

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
          ['receipt_no', 'created_at', 'customer', 'payment_method', 'status', 'total_amount'],
          rows.map((s) => [
            `REC-${String(s.receipt_no).padStart(5, '0')}`,
            s.created_at,
            s.customer_name ?? 'walk-in',
            s.payment_method,
            s.status,
            s.total_amount.toFixed(2),
          ])
        )
        return csvResponse(body, csvFilename('sales', r.startDate, r.endDate))
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
          rows.map((r) => [r.category_name, r.item_count, r.stock_value.toFixed(2)])
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

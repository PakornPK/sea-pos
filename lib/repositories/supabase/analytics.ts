import type {
  AnalyticsRepository,
  TodaySummary,
  DailySeriesPoint,
  PaymentMixPoint,
  TopProduct,
  LowStockItem,
  RecentSale,
  InventoryValueByCategory,
  StockMovement,
  SalesByRangeSummary,
  SalesRowForExport,
} from '@/lib/repositories/contracts'
import { getDb } from './db'

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function isoDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}
function daysAgo(n: number): Date {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() - n)
  return d
}

export const supabaseAnalyticsRepo: AnalyticsRepository = {
  async todaySummary(): Promise<TodaySummary> {
    const db = await getDb()
    const sinceIso = startOfDay(new Date()).toISOString()

    const [{ data: sales }, { data: items }] = await Promise.all([
      db.from('sales')
        .select('id, total_amount, status')
        .gte('created_at', sinceIso)
        .eq('status', 'completed'),
      db.from('sale_items')
        .select('quantity, sale:sales!inner(status, created_at)')
        .gte('sale.created_at', sinceIso)
        .eq('sale.status', 'completed'),
    ])

    const billCount = sales?.length ?? 0
    const revenue = (sales ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
    const itemsSold = (items ?? []).reduce((s, r) => s + Number(r.quantity), 0)

    return {
      revenue,
      billCount,
      avgBill: billCount > 0 ? revenue / billCount : 0,
      itemsSold,
    }
  },

  async dailySeries(days: number): Promise<DailySeriesPoint[]> {
    const db = await getDb()
    const since = daysAgo(days - 1)
    const { data } = await db
      .from('sales')
      .select('created_at, total_amount, status')
      .gte('created_at', since.toISOString())
      .eq('status', 'completed')

    const buckets = new Map<string, { revenue: number; count: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      buckets.set(isoDate(d), { revenue: 0, count: 0 })
    }
    for (const r of data ?? []) {
      const key = isoDate(r.created_at)
      const b = buckets.get(key)
      if (b) {
        b.revenue += Number(r.total_amount)
        b.count += 1
      }
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({
      date, revenue: v.revenue, count: v.count,
    }))
  },

  async paymentMix(days: number): Promise<PaymentMixPoint[]> {
    const db = await getDb()
    const since = daysAgo(days - 1).toISOString()
    const { data } = await db
      .from('sales')
      .select('payment_method, total_amount, status')
      .gte('created_at', since)
      .eq('status', 'completed')

    const buckets = new Map<string, { total: number; count: number }>()
    for (const r of data ?? []) {
      const key = r.payment_method as string
      const b = buckets.get(key) ?? { total: 0, count: 0 }
      b.total += Number(r.total_amount)
      b.count += 1
      buckets.set(key, b)
    }
    return (['cash', 'card', 'transfer'] as const).map((method) => {
      const b = buckets.get(method) ?? { total: 0, count: 0 }
      return { method, total: b.total, count: b.count }
    })
  },

  async topProducts(days: number, limit: number): Promise<TopProduct[]> {
    const db = await getDb()
    const since = daysAgo(days - 1).toISOString()
    const { data } = await db
      .from('sale_items')
      .select('product_id, quantity, subtotal, product:products(name, sku), sale:sales!inner(status, created_at)')
      .gte('sale.created_at', since)
      .eq('sale.status', 'completed')

    const buckets = new Map<string, TopProduct>()
    for (const r of (data ?? []) as Array<{
      product_id: string
      quantity: number
      subtotal: number
      product: { name?: string; sku?: string | null } | Array<{ name?: string; sku?: string | null }> | null
    }>) {
      const prod = Array.isArray(r.product) ? r.product[0] : r.product
      const existing = buckets.get(r.product_id)
      if (existing) {
        existing.revenue += Number(r.subtotal)
        existing.quantity += Number(r.quantity)
      } else {
        buckets.set(r.product_id, {
          product_id: r.product_id,
          name: prod?.name ?? '—',
          sku: prod?.sku ?? null,
          revenue: Number(r.subtotal),
          quantity: Number(r.quantity),
        })
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  },

  async lowStock(limit = 10): Promise<LowStockItem[]> {
    // Aggregates pivot rows across every branch the caller can see (RLS filters).
    // Sums quantity per product, compares to product.min_stock.
    const db = await getDb()
    const { data } = await db
      .from('product_stock')
      .select('quantity, product:products(id, name, sku, min_stock)')
      .limit(2000)

    const byProduct = new Map<string, LowStockItem>()
    for (const r of (data ?? []) as Array<{
      quantity: number
      product: { id?: string; name?: string; sku?: string | null; min_stock?: number }
             | Array<{ id?: string; name?: string; sku?: string | null; min_stock?: number }>
             | null
    }>) {
      const p = Array.isArray(r.product) ? r.product[0] : r.product
      if (!p?.id) continue
      const prev = byProduct.get(p.id)
      if (prev) {
        prev.stock += Number(r.quantity)
      } else {
        byProduct.set(p.id, {
          id:        p.id,
          name:      p.name ?? '—',
          sku:       p.sku ?? null,
          stock:     Number(r.quantity),
          min_stock: Number(p.min_stock ?? 0),
        })
      }
    }
    return Array.from(byProduct.values())
      .filter((p) => p.stock <= p.min_stock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, limit)
  },

  async recentSales(limit = 10, opts: { branchId?: string | null } = {}): Promise<RecentSale[]> {
    const db = await getDb()
    let q = db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name), branch:branches(code)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (opts.branchId) q = q.eq('branch_id', opts.branchId)
    const { data } = await q
    return (data ?? []).map((s) => {
      const c = Array.isArray(s.customer) ? s.customer[0] : s.customer
      const b = Array.isArray(s.branch)   ? s.branch[0]   : s.branch
      return {
        id: s.id,
        receipt_no: s.receipt_no,
        created_at: s.created_at,
        total_amount: Number(s.total_amount),
        payment_method: s.payment_method,
        status: s.status,
        customer_name: (c as { name?: string } | null)?.name ?? null,
        branch_code:   (b as { code?: string } | null)?.code ?? null,
      }
    })
  },

  async inventoryValueByCategory(): Promise<InventoryValueByCategory[]> {
    // Walk product_stock and join back to product + category so we include
    // stock at every branch the caller can see (RLS filters).
    const db = await getDb()
    const { data } = await db
      .from('product_stock')
      .select('quantity, product:products(id, cost, category_id, category:categories(id, name))')

    const buckets = new Map<string, InventoryValueByCategory>()
    const seen = new Map<string, Set<string>>()   // categoryKey → productIds for item_count

    type ProdShape = {
      id?: string
      cost?: number
      category_id?: string | null
      category?: { id?: string; name?: string } | Array<{ id?: string; name?: string }> | null
    }
    for (const r of (data ?? []) as Array<{
      quantity: number
      product: ProdShape | ProdShape[] | null
    }>) {
      const p: ProdShape | null = Array.isArray(r.product) ? (r.product[0] ?? null) : r.product
      if (!p || !p.id) continue
      const cat = Array.isArray(p.category) ? p.category[0] : p.category
      const key = p.category_id ?? '__uncat__'

      const existing = buckets.get(key) ?? {
        category_id:   p.category_id ?? null,
        category_name: cat?.name ?? 'ไม่ระบุหมวดหมู่',
        item_count:    0,
        stock_value:   0,
      }
      existing.stock_value += Number(r.quantity) * Number(p.cost ?? 0)
      buckets.set(key, existing)

      const ids = seen.get(key) ?? new Set<string>()
      ids.add(p.id)
      seen.set(key, ids)
    }

    for (const [key, ids] of seen) {
      const b = buckets.get(key)
      if (b) b.item_count = ids.size
    }

    return Array.from(buckets.values()).sort((a, b) => b.stock_value - a.stock_value)
  },

  async stockMovements(opts = {}): Promise<StockMovement[]> {
    const db = await getDb()
    let q = db
      .from('stock_logs')
      .select('id, product_id, change, reason, user_id, created_at, product:products(name)')
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 200)
    if (opts.start)     q = q.gte('created_at', opts.start)
    if (opts.end)       q = q.lte('created_at', opts.end)
    if (opts.productId) q = q.eq('product_id', opts.productId)
    if (opts.branchId)  q = q.eq('branch_id',  opts.branchId)

    const { data } = await q
    return (data ?? []).map((r) => {
      const prod = Array.isArray(r.product) ? r.product[0] : r.product
      return {
        id: r.id,
        product_id: r.product_id,
        product_name: (prod as { name?: string } | null)?.name ?? '—',
        change: r.change,
        reason: r.reason,
        user_id: r.user_id,
        created_at: r.created_at,
      }
    })
  },

  async salesByRange(start: string, end: string): Promise<SalesByRangeSummary> {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('total_amount, status')
      .gte('created_at', start)
      .lte('created_at', end)

    let totalRevenue = 0
    let billCount = 0
    let voidedCount = 0
    for (const s of data ?? []) {
      if (s.status === 'completed') {
        billCount += 1
        totalRevenue += Number(s.total_amount)
      } else if (s.status === 'voided') {
        voidedCount += 1
      }
    }
    return {
      totalRevenue,
      billCount,
      voidedCount,
      avgBill: billCount > 0 ? totalRevenue / billCount : 0,
    }
  },

  async salesRowsByRange(start: string, end: string): Promise<SalesRowForExport[]> {
    const db = await getDb()
    const { data } = await db
      .from('sales')
      .select('id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('receipt_no', { ascending: false })

    return (data ?? []).map((s) => {
      const c = Array.isArray(s.customer) ? s.customer[0] : s.customer
      return {
        id: s.id,
        receipt_no: s.receipt_no,
        created_at: s.created_at,
        total_amount: Number(s.total_amount),
        payment_method: s.payment_method,
        status: s.status,
        customer_name: (c as { name?: string } | null)?.name ?? null,
      }
    })
  },
}

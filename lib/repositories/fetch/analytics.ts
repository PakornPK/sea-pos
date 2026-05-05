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
  VatSummary,
  PurchaseVatSummary,
  PurchaseRowForExport,
  BranchScope,
} from '@/lib/repositories/contracts'
import { restGet } from '@/lib/api/rest'
import { average, sumBy, add, mul } from '@/lib/money'

type RestGetFn = <T>(table: string, params?: Record<string, string | string[]>) => Promise<T>

export function createAnalyticsRepo(get: RestGetFn): AnalyticsRepository {
  return repoImpl(get)
}

function startOfDay(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function isoDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function repoImpl(get: RestGetFn): AnalyticsRepository { return {
  async todaySummary(opts: BranchScope = {}): Promise<TodaySummary> {
    const since = startOfDay()
    const salesParams: Record<string, string | string[]> = {
      select:     'id,total_amount,status',
      created_at: `gte.${since}`,
      status:     'eq.completed',
    }
    if (opts.branchId) salesParams.branch_id = `eq.${opts.branchId}`

    const sales = await get<Array<{ id: string; total_amount: string }>>('sales', salesParams)

    const billCount = sales.length
    const revenue   = sumBy(sales, (r) => r.total_amount)
    const saleIds   = sales.map((s) => s.id)

    let itemsSold = 0
    if (saleIds.length > 0) {
      const items = await get<Array<{ quantity: string }>>('sale_items', {
        select:  'quantity',
        sale_id: `in.(${saleIds.join(',')})`,
      })
      itemsSold = items.reduce((s, r) => s + Number(r.quantity), 0)
    }
    return { revenue, billCount, avgBill: average(revenue, billCount), itemsSold }
  },

  async dailySeries(days: number, opts: BranchScope = {}): Promise<DailySeriesPoint[]> {
    const since = daysAgoIso(days - 1)
    const params: Record<string, string | string[]> = {
      select:     'created_at,total_amount',
      created_at: `gte.${since}`,
      status:     'eq.completed',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    const data = await get<Array<{ created_at: string; total_amount: string }>>('sales', params)

    const buckets = new Map<string, { revenue: number; count: number }>()
    const sinceDate = new Date(since)
    for (let i = 0; i < days; i++) {
      const d = new Date(sinceDate)
      d.setDate(d.getDate() + i)
      buckets.set(isoDate(d), { revenue: 0, count: 0 })
    }
    for (const r of data) {
      const key = isoDate(r.created_at)
      const b = buckets.get(key)
      if (b) { b.revenue = add(b.revenue, r.total_amount); b.count += 1 }
    }
    return Array.from(buckets.entries()).map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }))
  },

  async paymentMix(days: number, opts: BranchScope = {}): Promise<PaymentMixPoint[]> {
    const since = daysAgoIso(days - 1)
    const params: Record<string, string | string[]> = {
      select:     'payment_method,total_amount',
      created_at: `gte.${since}`,
      status:     'eq.completed',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    const data = await get<Array<{ payment_method: string; total_amount: string }>>('sales', params)

    const buckets = new Map<string, { total: number; count: number }>()
    for (const r of data) {
      const b = buckets.get(r.payment_method) ?? { total: 0, count: 0 }
      b.total = add(b.total, r.total_amount)
      b.count += 1
      buckets.set(r.payment_method, b)
    }
    return (['cash', 'card', 'transfer'] as const).map((method) => {
      const b = buckets.get(method) ?? { total: 0, count: 0 }
      return { method, total: b.total, count: b.count }
    })
  },

  async topProducts(days: number, limit: number, opts: BranchScope = {}): Promise<TopProduct[]> {
    const since = daysAgoIso(days - 1)
    const salesParams: Record<string, string | string[]> = {
      select:     'id',
      created_at: `gte.${since}`,
      status:     'eq.completed',
    }
    if (opts.branchId) salesParams.branch_id = `eq.${opts.branchId}`

    const sales = await get<Array<{ id: string }>>('sales', salesParams)
    if (sales.length === 0) return []

    const saleIds = sales.map((s) => s.id)
    type ProdRow = { name: string; sku: string | null }
    const items = await get<Array<{
      product_id:   string
      quantity:     string
      subtotal:     string
      cost_at_sale: string | null
      products:     ProdRow | ProdRow[] | null
    }>>('sale_items', {
      select:  'product_id,quantity,subtotal,cost_at_sale,products(name,sku)',
      sale_id: `in.(${saleIds.join(',')})`,
    })

    const buckets = new Map<string, TopProduct>()
    for (const r of items) {
      const prod = Array.isArray(r.products) ? r.products[0] : r.products
      const rowCogs = r.cost_at_sale != null ? mul(r.cost_at_sale, r.quantity) : 0
      const existing = buckets.get(r.product_id)
      if (existing) {
        existing.revenue  = add(existing.revenue, r.subtotal)
        existing.quantity += Number(r.quantity)
        existing.cogs     = add(existing.cogs, rowCogs)
      } else {
        buckets.set(r.product_id, {
          product_id: r.product_id,
          name:       prod?.name ?? '—',
          sku:        prod?.sku  ?? null,
          revenue:    Number(r.subtotal),
          quantity:   Number(r.quantity),
          cogs:       rowCogs,
          margin_pct: 0,
        })
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((p) => ({ ...p, margin_pct: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0 }))
  },

  async lowStock(limit = 10, opts: BranchScope = {}): Promise<LowStockItem[]> {
    const params: Record<string, string | string[]> = {
      select: 'quantity,products(id,name,sku,min_stock)',
      limit:  '2000',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    type ProdRow = { id: string; name: string; sku: string | null; min_stock: string | null }
    const data = await get<Array<{ quantity: string; products: ProdRow | ProdRow[] | null }>>('product_stock', params)

    const byProduct = new Map<string, LowStockItem>()
    for (const r of data) {
      const p = Array.isArray(r.products) ? r.products[0] : r.products
      if (!p?.id) continue
      const prev = byProduct.get(p.id)
      if (prev) {
        prev.stock += Number(r.quantity)
      } else {
        byProduct.set(p.id, {
          id:        p.id,
          name:      p.name  ?? '—',
          sku:       p.sku   ?? null,
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

  async recentSales(limit = 10, opts: BranchScope = {}): Promise<RecentSale[]> {
    const params: Record<string, string | string[]> = {
      select: 'id,receipt_no,created_at,total_amount,payment_method,status,customers(name),branches(code)',
      order:  'created_at.desc',
      limit:  String(limit),
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    type CRow = { name: string }
    type BRow = { code: string }
    const data = await get<Array<{
      id: string; receipt_no: number; created_at: string; total_amount: string
      payment_method: string; status: string
      customers: CRow | CRow[] | null
      branches:  BRow | BRow[] | null
    }>>('sales', params)

    return data.map((s) => {
      const c = Array.isArray(s.customers) ? s.customers[0] : s.customers
      const b = Array.isArray(s.branches)  ? s.branches[0]  : s.branches
      return {
        id:             s.id,
        receipt_no:     s.receipt_no,
        created_at:     s.created_at,
        total_amount:   Number(s.total_amount),
        payment_method: s.payment_method,
        status:         s.status,
        customer_name:  c?.name ?? null,
        branch_code:    b?.code ?? null,
      }
    })
  },

  async inventoryValueByCategory(opts: BranchScope = {}): Promise<InventoryValueByCategory[]> {
    const params: Record<string, string | string[]> = {
      select: 'quantity,products(id,cost,category_id,categories(id,name))',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    type CatRow  = { id: string; name: string }
    type ProdRow = { id: string; cost: string | null; category_id: string | null; categories: CatRow | CatRow[] | null }
    const data   = await get<Array<{ quantity: string; products: ProdRow | ProdRow[] | null }>>('product_stock', params)

    const buckets = new Map<string, InventoryValueByCategory>()
    const seen    = new Map<string, Set<string>>()

    for (const r of data) {
      const p: ProdRow | null = Array.isArray(r.products) ? (r.products[0] ?? null) : r.products
      if (!p?.id) continue
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories
      const key = p.category_id ?? '__uncat__'
      const existing = buckets.get(key) ?? {
        category_id:   p.category_id ?? null,
        category_name: cat?.name ?? 'ไม่ระบุหมวดหมู่',
        item_count:    0,
        stock_value:   0,
      }
      existing.stock_value = add(existing.stock_value, mul(r.quantity, p.cost ?? 0))
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

  async stockMovements(opts: {
    start?: string; end?: string; productId?: string; branchId?: string | null; limit?: number
  } = {}): Promise<StockMovement[]> {
    const createdAt: string[] = []
    if (opts.start) createdAt.push(`gte.${opts.start}`)
    if (opts.end)   createdAt.push(`lte.${opts.end}`)

    const params: Record<string, string | string[]> = {
      select: 'id,product_id,change,reason,user_id,created_at,products(name)',
      order:  'created_at.desc',
      limit:  String(opts.limit ?? 200),
    }
    if (createdAt.length === 1) params.created_at = createdAt[0]
    if (createdAt.length === 2) params.created_at = createdAt
    if (opts.productId) params.product_id = `eq.${opts.productId}`
    if (opts.branchId)  params.branch_id  = `eq.${opts.branchId}`

    type ProdRow = { name: string }
    const data = await get<Array<{
      id: string; product_id: string; change: number; reason: string | null
      user_id: string | null; created_at: string; products: ProdRow | ProdRow[] | null
    }>>('stock_logs', params)

    return data.map((r) => {
      const prod = Array.isArray(r.products) ? r.products[0] : r.products
      return {
        id:           r.id,
        product_id:   r.product_id,
        product_name: prod?.name ?? '—',
        change:       r.change,
        reason:       r.reason,
        user_id:      r.user_id,
        created_at:   r.created_at,
      }
    })
  },

  async salesByRange(start: string, end: string, opts: BranchScope = {}): Promise<SalesByRangeSummary> {
    const params: Record<string, string | string[]> = {
      select:     'id,total_amount,status',
      created_at: [`gte.${start}`, `lte.${end}`],
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    const salesData = await get<Array<{ id: string; total_amount: string; status: string }>>('sales', params)

    let totalRevenue = 0, billCount = 0, voidedCount = 0
    const completedIds: string[] = []
    for (const s of salesData) {
      if (s.status === 'completed') {
        billCount += 1
        totalRevenue = add(totalRevenue, s.total_amount)
        completedIds.push(s.id)
      } else if (s.status === 'voided') {
        voidedCount += 1
      }
    }

    let cogs = 0
    if (completedIds.length > 0) {
      const itemsData = await get<Array<{ cost_at_sale: string | null; quantity: string }>>('sale_items', {
        select:  'cost_at_sale,quantity',
        sale_id: `in.(${completedIds.join(',')})`,
      })
      for (const item of itemsData) {
        if (item.cost_at_sale != null) cogs = add(cogs, mul(item.cost_at_sale, item.quantity))
      }
    }

    const gross_profit  = add(totalRevenue, -cogs)
    const profit_margin = totalRevenue > 0 ? (gross_profit / totalRevenue) * 100 : 0
    return { totalRevenue, billCount, voidedCount, avgBill: average(totalRevenue, billCount), cogs, gross_profit, profit_margin }
  },

  async salesRowsByRange(start: string, end: string, opts: BranchScope = {}): Promise<SalesRowForExport[]> {
    const params: Record<string, string | string[]> = {
      select:     'id,receipt_no,created_at,total_amount,subtotal_ex_vat,vat_amount,payment_method,status,customers(name)',
      created_at: [`gte.${start}`, `lte.${end}`],
      order:      'receipt_no.desc',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    type CRow = { name: string }
    const data = await get<Array<{
      id: string; receipt_no: number; created_at: string
      total_amount: string; subtotal_ex_vat: string | null; vat_amount: string | null
      payment_method: string; status: string
      customers: CRow | CRow[] | null
    }>>('sales', params)

    return data.map((s) => {
      const c = Array.isArray(s.customers) ? s.customers[0] : s.customers
      return {
        id:              s.id,
        receipt_no:      s.receipt_no,
        created_at:      s.created_at,
        subtotal_ex_vat: Number(s.subtotal_ex_vat ?? s.total_amount),
        vat_amount:      Number(s.vat_amount ?? 0),
        total_amount:    Number(s.total_amount),
        payment_method:  s.payment_method,
        status:          s.status,
        customer_name:   c?.name ?? null,
      }
    })
  },

  async vatSummary(start: string, end: string, opts: BranchScope = {}): Promise<VatSummary> {
    const params: Record<string, string | string[]> = {
      select:     'total_amount,subtotal_ex_vat,vat_amount',
      created_at: [`gte.${start}`, `lte.${end}`],
      status:     'eq.completed',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    const data = await get<Array<{
      total_amount: string; subtotal_ex_vat: string | null; vat_amount: string | null
    }>>('sales', params)

    let netSales = 0, vatOutput = 0, grossSales = 0, vatBills = 0, zeroBills = 0
    for (const r of data) {
      const gross = Number(r.total_amount)
      const vat   = Number(r.vat_amount ?? 0)
      const net   = Number(r.subtotal_ex_vat ?? gross)
      grossSales = add(grossSales, gross)
      vatOutput  = add(vatOutput,  vat)
      netSales   = add(netSales,   net)
      if (vat > 0) vatBills += 1; else zeroBills += 1
    }
    return { netSales, vatOutput, grossSales, vatBills, zeroBills }
  },

  async purchaseVatSummary(start: string, end: string, opts: BranchScope = {}): Promise<PurchaseVatSummary> {
    const params: Record<string, string | string[]> = {
      select:      'total_amount,subtotal_ex_vat,vat_amount',
      received_at: [`gte.${start}`, `lte.${end}`],
      status:      'eq.received',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    const data = await get<Array<{
      total_amount: string; subtotal_ex_vat: string | null; vat_amount: string | null
    }>>('purchase_orders', params)

    let netPurchases = 0, vatInput = 0, grossPurchases = 0, vatPos = 0, zeroPos = 0
    for (const r of data) {
      const gross = Number(r.total_amount)
      const vat   = Number(r.vat_amount ?? 0)
      const net   = Number(r.subtotal_ex_vat ?? gross)
      grossPurchases = add(grossPurchases, gross)
      vatInput       = add(vatInput,       vat)
      netPurchases   = add(netPurchases,   net)
      if (vat > 0) vatPos += 1; else zeroPos += 1
    }
    return { netPurchases, vatInput, grossPurchases, vatPos, zeroPos }
  },

  async purchaseRowsByRange(start: string, end: string, opts: BranchScope = {}): Promise<PurchaseRowForExport[]> {
    const params: Record<string, string | string[]> = {
      select:      'id,po_no,received_at,total_amount,subtotal_ex_vat,vat_amount,suppliers(name)',
      received_at: [`gte.${start}`, `lte.${end}`],
      status:      'eq.received',
      order:       'po_no.desc',
    }
    if (opts.branchId) params.branch_id = `eq.${opts.branchId}`

    type SRow = { name: string }
    const data = await get<Array<{
      id: string; po_no: number; received_at: string | null
      total_amount: string; subtotal_ex_vat: string | null; vat_amount: string | null
      suppliers: SRow | SRow[] | null
    }>>('purchase_orders', params)

    return data.map((p) => {
      const s = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers
      return {
        id:              p.id,
        po_no:           p.po_no,
        received_at:     p.received_at,
        subtotal_ex_vat: Number(p.subtotal_ex_vat ?? p.total_amount),
        vat_amount:      Number(p.vat_amount ?? 0),
        total_amount:    Number(p.total_amount),
        supplier_name:   s?.name ?? null,
      }
    })
  },
}}

export const fetchAnalyticsRepo = createAnalyticsRepo(restGet)

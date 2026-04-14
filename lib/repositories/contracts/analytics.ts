export type TodaySummary = {
  revenue:   number
  billCount: number
  avgBill:   number
  itemsSold: number
}

export type DailySeriesPoint = {
  date:    string
  revenue: number
  count:   number
}

export type PaymentMixPoint = {
  method: 'cash' | 'card' | 'transfer'
  total:  number
  count:  number
}

export type TopProduct = {
  product_id: string
  name:       string
  sku:        string | null
  revenue:    number
  quantity:   number
}

export type LowStockItem = {
  id:        string
  name:      string
  sku:       string | null
  stock:     number
  min_stock: number
}

export type RecentSale = {
  id:             string
  receipt_no:     number
  created_at:     string
  total_amount:   number
  payment_method: string
  status:         string
  customer_name:  string | null
  branch_code:    string | null
}

export type InventoryValueByCategory = {
  category_id:   string | null
  category_name: string
  item_count:    number
  stock_value:   number
}

export type StockMovement = {
  id:           string
  product_id:   string
  product_name: string
  change:       number
  reason:       string | null
  user_id:      string | null
  created_at:   string
}

export type SalesByRangeSummary = {
  totalRevenue: number
  billCount:    number
  voidedCount:  number
  avgBill:      number
}

export type VatSummary = {
  /** Sum of subtotal_ex_vat across completed sales in the range. */
  netSales:    number
  /** Sum of vat_amount across completed sales in the range (VAT output / ภาษีขาย). */
  vatOutput:   number
  /** Sum of total_amount — equals netSales + vatOutput for the same rows. */
  grossSales:  number
  /** Number of completed sales that carried any VAT. */
  vatBills:    number
  /** Number of completed sales with vat_amount = 0 (zero-rated / exempt). */
  zeroBills:   number
}

export type SalesRowForExport = {
  id:              string
  receipt_no:      number
  created_at:      string
  subtotal_ex_vat: number
  vat_amount:      number
  total_amount:    number
  payment_method:  string
  status:          string
  customer_name:   string | null
}

export type BranchScope = { branchId?: string | null }

export interface AnalyticsRepository {
  todaySummary(opts?: BranchScope): Promise<TodaySummary>
  dailySeries(days: number, opts?: BranchScope): Promise<DailySeriesPoint[]>
  paymentMix(days: number, opts?: BranchScope): Promise<PaymentMixPoint[]>
  topProducts(days: number, limit: number, opts?: BranchScope): Promise<TopProduct[]>
  lowStock(limit?: number, opts?: BranchScope): Promise<LowStockItem[]>
  recentSales(limit?: number, opts?: BranchScope): Promise<RecentSale[]>
  inventoryValueByCategory(opts?: BranchScope): Promise<InventoryValueByCategory[]>
  stockMovements(opts?: {
    start?: string
    end?: string
    productId?: string
    branchId?: string | null
    limit?: number
  }): Promise<StockMovement[]>
  salesByRange(start: string, end: string, opts?: BranchScope): Promise<SalesByRangeSummary>
  salesRowsByRange(start: string, end: string, opts?: BranchScope): Promise<SalesRowForExport[]>
  /** Tax summary for a period. Only completed sales contribute. */
  vatSummary(start: string, end: string, opts?: BranchScope): Promise<VatSummary>
}

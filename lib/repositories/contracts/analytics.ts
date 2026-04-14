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

export type SalesRowForExport = {
  id:             string
  receipt_no:     number
  created_at:     string
  total_amount:   number
  payment_method: string
  status:         string
  customer_name:  string | null
}

export interface AnalyticsRepository {
  todaySummary(): Promise<TodaySummary>
  dailySeries(days: number): Promise<DailySeriesPoint[]>
  paymentMix(days: number): Promise<PaymentMixPoint[]>
  topProducts(days: number, limit: number): Promise<TopProduct[]>
  lowStock(limit?: number): Promise<LowStockItem[]>
  recentSales(limit?: number, opts?: { branchId?: string | null }): Promise<RecentSale[]>
  inventoryValueByCategory(): Promise<InventoryValueByCategory[]>
  stockMovements(opts?: {
    start?: string
    end?: string
    productId?: string
    branchId?: string | null
    limit?: number
  }): Promise<StockMovement[]>
  salesByRange(start: string, end: string): Promise<SalesByRangeSummary>
  salesRowsByRange(start: string, end: string): Promise<SalesRowForExport[]>
}

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
  cogs:       number
  margin_pct: number
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
  totalRevenue:  number
  billCount:     number
  voidedCount:   number
  avgBill:       number
  cogs:          number   // sum of cost_at_sale × quantity for completed sales
  gross_profit:  number   // revenue - cogs (only for sales where cost is known)
  profit_margin: number   // gross_profit / revenue * 100 (0 when revenue=0)
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

export type PurchaseVatSummary = {
  /** Sum of subtotal_ex_vat on received POs in the range. */
  netPurchases: number
  /** Sum of vat_amount on received POs (VAT input / ภาษีซื้อ). */
  vatInput:     number
  /** Sum of total_amount — equals netPurchases + vatInput for the same rows. */
  grossPurchases: number
  /** Number of received POs that carried any VAT. */
  vatPos:       number
  /** Number of received POs with vat_amount = 0. */
  zeroPos:      number
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

export type PurchaseRowForExport = {
  id:              string
  po_no:           number
  received_at:     string | null
  subtotal_ex_vat: number
  vat_amount:      number
  total_amount:    number
  supplier_name:   string | null
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
  /** Output VAT summary for a period. Only completed sales contribute. */
  vatSummary(start: string, end: string, opts?: BranchScope): Promise<VatSummary>
  /**
   * Input VAT summary for a period. Only `received` POs contribute —
   * until goods are received the claim isn't realized.
   * Date range is matched against `received_at`.
   */
  purchaseVatSummary(start: string, end: string, opts?: BranchScope): Promise<PurchaseVatSummary>
  /** Per-PO rows for the VAT CSV (input side). Filtered to status='received'. */
  purchaseRowsByRange(start: string, end: string, opts?: BranchScope): Promise<PurchaseRowForExport[]>
}

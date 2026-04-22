// ─── Row types (what SELECT returns) ─────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'cashier' | 'purchasing'

/**
 * Plan code — FK to `plans.code`. String at the type level because platform
 * admins can add tiers via the plans config table (see `lib/repositories/plan.ts`).
 * Seeded defaults: 'free', 'lite_pro', 'standard_pro', 'enterprise'.
 */
export type CompanyPlan = string

export type CompanyStatus = 'pending' | 'active' | 'suspended' | 'closed'

export type Plan = {
  code: string
  name: string
  description: string | null
  max_products: number | null   // null = unlimited
  max_users: number | null
  max_branches: number | null
  monthly_price_baht: number | null   // null = "Contact us"
  yearly_price_baht:  number | null   // null = yearly option not available
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Company = {
  id: string
  name: string
  slug: string | null
  owner_id: string | null
  plan: CompanyPlan
  status: CompanyStatus
  settings: Record<string, unknown>
  // Billing info (added in migration 024)
  tax_id:        string | null
  address:       string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export type Profile = {
  id: string
  role: UserRole
  first_name: string | null
  last_name:  string | null
  full_name:  string | null
  company_id: string | null
  is_platform_admin: boolean
  created_at: string
}

export type CategoryType = 'sale' | 'option' | 'both' | 'cost'

export type Category = {
  id:            string
  name:          string
  sku_prefix:    string | null
  vat_exempt:    boolean
  category_type: CategoryType
  created_at:    string
}

export type CategoryInsert = {
  name: string
  sku_prefix?: string | null
  vat_exempt?: boolean
}

/**
 * Master product record. Stock no longer lives here — see `product_stock`
 * (per-branch pivot, migration 014). Use `ProductWithStock` for views that
 * need a stock number resolved for a specific branch.
 */
export type Product = {
  id: string
  sku: string
  name: string
  price: number
  cost: number
  min_stock: number
  unit: string                  // unit of measure, e.g. ชิ้น, กก., ลิตร
  category_id: string | null
  image_url: string | null
  vat_exempt: boolean
  barcode: string | null
  track_stock: boolean          // false = always show in POS, never decrement stock
  po_unit: string | null        // unit used in purchase orders (null = same as unit)
  po_conversion: number         // stock units per 1 PO unit (e.g. 1000 for kg→g)
  created_at: string
}

// ─── Product Cost Items (BOM) ─────────────────────────────────────────────────

export type ProductCostItem = {
  id:                string
  company_id:        string
  product_id:        string
  name:              string
  quantity:          number
  unit_cost:         number
  linked_product_id: string | null
  sort_order:        number
  created_at:        string
}

export type ProductCostItemInsert = {
  product_id:        string
  name:              string
  quantity:          number
  unit_cost:         number
  linked_product_id?: string | null
  sort_order?:       number
}

// ─────────────────────────────────────────────────────────────────────────────

export type ProductWithCategory = Product & {
  category: Pick<Category, 'id' | 'name'> | null
}

/** Product joined with its stock at a specific branch. */
export type ProductWithStock = Product & {
  stock:       number          // resolved from product_stock.quantity
  has_options: boolean         // true when option_groups exist for this product
}

export type ProductWithStockAndCategory = ProductWithStock & {
  category: Pick<Category, 'id' | 'name'> | null
  /**
   * Per-branch stock breakdown. Populated by admin "ทุกสาขา" view; undefined
   * in single-branch views. `stock` in that view equals the sum.
   */
  stock_by_branch?: Array<{ branch_id: string; branch_code: string; branch_name: string; quantity: number }>
}

// ─── Branches (multi-branch, Release 2) ──────────────────────────────────────

export type Branch = {
  id:          string
  company_id:  string
  name:        string
  code:        string          // receipt-number prefix, e.g. 'B01'
  address:     string | null
  phone:       string | null
  tax_id:      string | null
  is_default:  boolean
  created_at:  string
}

export type BranchInsert = {
  name:        string
  code:        string
  address?:    string | null
  phone?:      string | null
  tax_id?:     string | null
  is_default?: boolean
}

export type UserBranch = {
  user_id:     string
  branch_id:   string
  company_id:  string
  is_default:  boolean
  created_at:  string
}

export type ProductStock = {
  product_id:  string
  branch_id:   string
  company_id:  string
  quantity:    number
  updated_at:  string
}

export type StockTransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled'

export type StockTransfer = {
  id:              string
  company_id:      string
  from_branch_id:  string
  to_branch_id:    string
  user_id:         string
  status:          StockTransferStatus
  notes:           string | null
  created_at:      string
  received_at:     string | null
}

export type StockTransferItem = {
  id:                 string
  transfer_id:        string
  product_id:         string
  quantity_sent:      number
  quantity_received:  number
  receive_note:       string | null
}

export type StockLog = {
  id: string
  product_id: string
  change: number
  reason: string | null
  user_id: string | null
  created_at: string
}

export type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export type Sale = {
  id: string
  receipt_no: number
  customer_id: string | null
  member_id: string | null
  user_id: string
  total_amount: number
  subtotal_ex_vat: number
  vat_amount: number
  member_discount_baht: number
  redeem_points_used: number
  payment_method: 'cash' | 'card' | 'transfer'
  status: 'completed' | 'voided'
  created_at: string
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  cost_at_sale: number | null
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export type PurchaseOrder = {
  id: string
  po_no: number
  supplier_id: string
  user_id: string
  branch_id: string
  status: PurchaseOrderStatus
  total_amount: number
  subtotal_ex_vat: number
  vat_amount: number
  notes: string | null
  ordered_at: string | null
  received_at: string | null
  created_at: string
  confirmed_by_user_id: string | null
}

export type PurchaseOrderItem = {
  id: string
  po_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
}

/** One item in a parked (held) bill — stored inline as JSONB on held_sales. */
export type HeldSaleItem = {
  productId:  string
  name:       string
  price:      number
  quantity:   number
  vatExempt:  boolean
}

export type HeldSale = {
  id:          string
  branch_id:   string
  user_id:     string
  customer_id: string | null
  items:       HeldSaleItem[]
  note:        string | null
  created_at:  string
}

// ─── Insert types (omit server-generated fields) ──────────────────────────────

export type ProfileInsert = {
  id: string
  role?: UserRole
  full_name?: string | null
}

export type ProductInsert = {
  name: string
  sku?: string | null
  price?: number
  cost?: number
  min_stock?: number
  unit?: string
  category_id?: string | null
  image_url?: string | null
  vat_exempt?: boolean
  barcode?: string | null
  track_stock?: boolean
  po_unit?: string | null
  po_conversion?: number
  // Note: stock is seeded via productStockRepo.set(productId, branchId, qty)
  // in a follow-up call; it is no longer a column on products.
}

export type StockLogInsert = {
  product_id: string
  change: number
  reason?: string | null
  user_id?: string | null
}

export type CustomerInsert = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type SupplierInsert = {
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
}

export type SaleInsert = {
  customer_id?: string | null
  user_id: string
  total_amount: number
  subtotal_ex_vat?: number
  vat_amount?: number
  payment_method: Sale['payment_method']
  status?: Sale['status']
}

export type SaleItemInsert = {
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  cost_at_sale?: number | null
}

export type PurchaseOrderInsert = {
  supplier_id: string
  user_id: string
  status?: PurchaseOrder['status']
  total_amount: number
}

export type PurchaseOrderItemInsert = {
  po_id: string
  product_id: string
  quantity_ordered: number
  unit_cost: number
}

// ─── Composite / joined types ─────────────────────────────────────────────────

export type SaleWithItems = Sale & {
  items: SaleItem[]
}

export type PurchaseOrderWithItems = PurchaseOrder & {
  items: PurchaseOrderItem[]
  supplier: Supplier
}

// ─── Billing / Platform types (migration 024) ─────────────────────────────────

export type PlatformSettings = {
  code:                 'default'
  seller_name:          string
  seller_tax_id:        string | null
  seller_address:       string | null
  seller_phone:         string | null
  seller_email:         string | null
  vat_enabled:          boolean
  vat_rate_pct:         number
  bank_name:            string | null
  bank_account_name:    string | null
  bank_account_no:      string | null
  promptpay_id:         string | null
  invoice_prefix:       string
  invoice_year:         number | null
  invoice_seq:          number
  updated_at:           string
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly'
export type PaymentMethod = 'bank_transfer' | 'promptpay' | 'cash' | 'other'

export type Subscription = {
  id:                   string
  company_id:           string
  plan_code:            string
  billing_cycle:        BillingCycle
  started_at:           string
  current_period_start: string
  current_period_end:   string
  due_date:             string
  status:               SubscriptionStatus
  overdue_months:       number
  notes:                string | null
  created_at:           string
  updated_at:           string
}

export type SubscriptionPayment = {
  id:              string
  subscription_id: string
  company_id:      string
  amount_baht:     number
  paid_at:         string
  method:          PaymentMethod
  reference_no:    string | null
  note:            string | null
  period_start:    string
  period_end:      string
  recorded_by:     string | null
  receipt_path:    string | null
  created_at:      string
}

export type InvoiceLine = {
  description:      string
  qty:              number
  unit_price_baht:  number
  amount_baht:      number
}

export type InvoiceStatus = 'draft' | 'issued' | 'void'

export type PlatformInvoice = {
  id:                   string
  invoice_no:           string
  company_id:           string
  subscription_id:      string | null
  payment_id:           string | null
  issued_at:            string
  due_at:               string | null
  status:               InvoiceStatus
  // Frozen seller snapshot
  seller_name:          string
  seller_tax_id:        string | null
  seller_address:       string | null
  seller_phone:         string | null
  seller_email:         string | null
  // Frozen buyer snapshot
  buyer_name:           string
  buyer_tax_id:         string | null
  buyer_address:        string | null
  buyer_contact_email:  string | null
  buyer_contact_phone:  string | null
  // Lines & amounts
  lines:                InvoiceLine[]
  subtotal_baht:        number
  vat_rate_pct:         number
  vat_baht:             number
  total_baht:           number
  // Notes
  notes:                string | null
  void_reason:          string | null
  voided_at:            string | null
  voided_by:            string | null
  issued_by:            string | null
  created_at:           string
  updated_at:           string
}

// ─── Product Options / Modifiers ─────────────────────────────────────────────

export type OptionGroup = {
  id:           string
  company_id:   string
  product_id:   string
  name:         string
  required:     boolean
  multi_select: boolean
  sort_order:   number
  created_at:   string
}

export type ProductOption = {
  id:                string
  group_id:          string
  name:              string
  price_delta:       number
  sort_order:        number
  is_active:         boolean
  created_at:        string
  linked_product_id: string | null
  quantity_per_use:  number
}

export type OptionGroupWithOptions = OptionGroup & {
  options: ProductOption[]
}

/** Selected option captured at cart/sale time. */
export type SelectedOption = {
  group_id:          string
  group_name:        string
  option_id:         string
  option_name:       string
  price_delta:       number
  linked_product_id: string | null
  quantity_per_use:  number
}

export type SaleItemOption = {
  id:                string
  sale_item_id:      string
  option_id:         string | null
  group_name:        string
  option_name:       string
  price_delta:       number
  linked_product_id: string | null
}

// ─── Membership ────────────────────────────────────────────────────────────────

export type MembershipSettings = {
  company_id:          string
  enabled:             boolean
  points_per_baht:     number
  baht_per_point:      number
  max_redeem_pct:      number
  points_expiry_days:  number | null
  created_at:          string
  updated_at:          string
}

export type MembershipTier = {
  id:                string
  company_id:        string
  name:              string
  color:             string
  min_spend_baht:    number
  discount_pct:      number
  points_multiplier: number
  sort_order:        number
  created_at:        string
}

export type MemberPointsLogType = 'earn' | 'redeem' | 'expire' | 'adjust'

export type Member = {
  id:              string
  company_id:      string
  member_no:       string
  name:            string
  phone:           string | null
  email:           string | null
  address:         string | null
  tier_id:         string | null
  points_balance:  number
  total_spend_baht: number
  enrolled_at:     string
  created_at:      string
}

export type MemberPointsLog = {
  id:           string
  company_id:   string
  member_id:    string
  type:         MemberPointsLogType
  points:       number
  balance_after: number
  sale_id:      string | null
  note:         string | null
  created_at:   string
}

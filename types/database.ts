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
  created_at: string
}

export type Profile = {
  id: string
  role: UserRole
  full_name: string | null
  company_id: string | null
  is_platform_admin: boolean
  created_at: string
}

export type Category = {
  id: string
  name: string
  sku_prefix: string | null
  created_at: string
}

export type CategoryInsert = {
  name: string
  sku_prefix?: string | null
}

export type Product = {
  id: string
  sku: string
  name: string
  price: number
  cost: number
  stock: number
  min_stock: number
  category_id: string | null
  image_url: string | null
  created_at: string
}

export type ProductWithCategory = Product & {
  category: Pick<Category, 'id' | 'name'> | null
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
  user_id: string
  total_amount: number
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
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export type PurchaseOrder = {
  id: string
  po_no: number
  supplier_id: string
  user_id: string
  status: PurchaseOrderStatus
  total_amount: number
  notes: string | null
  ordered_at: string | null
  received_at: string | null
  created_at: string
}

export type PurchaseOrderItem = {
  id: string
  po_id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
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
  stock?: number
  min_stock?: number
  category_id?: string | null
  image_url?: string | null
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
  payment_method: Sale['payment_method']
  status?: Sale['status']
}

export type SaleItemInsert = {
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
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

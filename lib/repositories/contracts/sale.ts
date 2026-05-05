import type { Sale, SaleItem } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export type SaleSummaryForStats = {
  total_amount: number
  created_at: string
  status: string
}

export type SaleListRow = {
  id: string
  receipt_no: number
  created_at: string
  total_amount: number
  payment_method: string
  status: string
  member_name: string | null
  branch:   { code: string; name: string } | { code: string; name: string }[] | null
}

export type SaleDetail = {
  id: string
  receipt_no: number
  member_id: string | null
  user_id: string
  branch_id: string
  total_amount: number
  subtotal_ex_vat: number
  vat_amount: number
  payment_method: string
  status: string
  created_at: string
  member_name: string | null
}

export type SaleItemOption = {
  group_name:  string
  option_name: string
  price_delta: number
}

export type SaleItemWithProduct = {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  product:
    | { name: string; sku: string | null }
    | { name: string; sku: string | null }[]
    | null
  sale_item_options: SaleItemOption[]
}

export interface SaleRepository {
  listRecent(limit?: number, opts?: { branchId?: string | null }): Promise<SaleListRow[]>
  listRecentPaginated(
    p: PageParams,
    opts?: { branchId?: string | null }
  ): Promise<Paginated<SaleListRow>>
  listCompletedForStats(): Promise<SaleSummaryForStats[]>
  getById(id: string): Promise<SaleDetail | null>
  getStatus(id: string): Promise<string | null>
  create(input: {
    user_id: string
    member_id?: string | null
    branch_id: string
    total_amount: number
    subtotal_ex_vat: number
    vat_amount: number
    member_discount_baht?: number
    redeem_points_used?: number
    payment_method: Sale['payment_method']
    items: Array<{ product_id: string; quantity: number; unit_price: number; subtotal: number; cost_at_sale?: number | null }>
  }): Promise<{ id: string; itemIds: string[] } | { error: string }>
  /** @deprecated use create() — backend requires items to be included in the sale payload */
  createHeader(input: {
    user_id: string
    member_id?: string | null
    branch_id: string
    total_amount: number
    subtotal_ex_vat: number
    vat_amount: number
    member_discount_baht?: number
    redeem_points_used?: number
    payment_method: Sale['payment_method']
  }): Promise<{ id: string } | { error: string }>
  /** @deprecated use create() — backend requires items to be included in the sale payload */
  insertItems(
    saleId: string,
    items: Array<{ product_id: string; quantity: number; unit_price: number; subtotal: number; cost_at_sale?: number | null }>
  ): Promise<{ ids: string[] } | { error: string }>
  listItems(saleId: string): Promise<Pick<SaleItem, 'product_id' | 'quantity'>[]>
  listItemsWithProduct(saleId: string): Promise<SaleItemWithProduct[]>
  markVoided(id: string): Promise<boolean | { error: string }>
}

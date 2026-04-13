import type { Sale, SaleItem } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export type SaleSummaryForStats = {
  customer_id: string | null
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
  customer: { name: string } | { name: string }[] | null
}

export type SaleDetail = {
  id: string
  receipt_no: number
  customer_id: string | null
  user_id: string
  total_amount: number
  payment_method: string
  status: string
  created_at: string
  customer:
    | { name: string; phone: string | null }
    | { name: string; phone: string | null }[]
    | null
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
}

export interface SaleRepository {
  listRecent(limit?: number): Promise<SaleListRow[]>
  listRecentPaginated(p: PageParams): Promise<Paginated<SaleListRow>>
  listForCustomer(customerId: string): Promise<Array<{
    id: string
    receipt_no: number
    created_at: string
    total_amount: number
    payment_method: string
    status: string
  }>>
  listCompletedForStats(): Promise<SaleSummaryForStats[]>
  getById(id: string): Promise<SaleDetail | null>
  getStatus(id: string): Promise<string | null>
  createHeader(input: {
    user_id: string
    customer_id: string | null
    total_amount: number
    payment_method: Sale['payment_method']
  }): Promise<{ id: string } | { error: string }>
  insertItems(
    saleId: string,
    items: Array<{ product_id: string; quantity: number; unit_price: number; subtotal: number }>
  ): Promise<string | null>
  listItems(saleId: string): Promise<Pick<SaleItem, 'product_id' | 'quantity'>[]>
  listItemsWithProduct(saleId: string): Promise<SaleItemWithProduct[]>
  markVoided(id: string): Promise<boolean | { error: string }>
}

import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export type POLineInput = {
  product_id: string
  quantity_ordered: number
  unit_cost: number
}

export type POListRow = {
  id: string
  po_no: number
  status: PurchaseOrderStatus
  total_amount: number
  ordered_at: string | null
  received_at: string | null
  created_at: string
  supplier: { name: string } | { name: string }[] | null
}

export type POItemWithProduct = {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  product:
    | { name?: string; sku?: string | null }
    | Array<{ name?: string; sku?: string | null }>
    | null
}

export interface PurchaseOrderRepository {
  listRecent(limit?: number): Promise<POListRow[]>
  listRecentPaginated(
    p: PageParams,
    opts?: { status?: PurchaseOrderStatus }
  ): Promise<Paginated<POListRow>>
  getById(id: string): Promise<PurchaseOrder | null>
  getStatus(id: string): Promise<PurchaseOrderStatus | null>
  listItemsWithProduct(poId: string): Promise<POItemWithProduct[]>
  createHeader(input: {
    supplier_id: string
    user_id: string
    total_amount: number
    notes: string | null
  }): Promise<{ id: string } | { error: string }>
  replaceItems(poId: string, items: POLineInput[]): Promise<string | null>
  updateHeader(
    id: string,
    input: { supplier_id: string; notes: string | null; total_amount: number }
  ): Promise<string | null>
  confirm(id: string): Promise<string | null>
  cancel(id: string): Promise<string | null>
  receiveItem(input: { itemId: string; qty: number; userId: string }): Promise<string | null>
}

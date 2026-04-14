import type { StockTransfer, StockTransferStatus } from '@/types/database'

export type StockTransferLineInput = {
  product_id:    string
  quantity_sent: number
}

export type StockTransferListRow = {
  id:             string
  status:         StockTransferStatus
  notes:          string | null
  created_at:     string
  received_at:    string | null
  from_branch:    { id: string; code: string; name: string }
  to_branch:      { id: string; code: string; name: string }
  item_count:     number
  total_quantity: number
}

export type StockTransferItemWithProduct = {
  id:                string
  product_id:        string
  quantity_sent:     number
  quantity_received: number
  receive_note:      string | null
  product: { name: string; sku: string | null }
}

export type ReceiveOverride = {
  itemId:           string
  quantityReceived: number
  receiveNote:      string | null
}

export type StockTransferDetail = StockTransfer & {
  from_branch:  { id: string; code: string; name: string }
  to_branch:    { id: string; code: string; name: string }
  items:        StockTransferItemWithProduct[]
}

export interface StockTransferRepository {
  /** Transfers involving at least one branch the caller can see. */
  list(opts?: { branchId?: string | null; status?: StockTransferStatus }): Promise<StockTransferListRow[]>

  getById(id: string): Promise<StockTransferDetail | null>

  /**
   * Create a transfer row + items in one shot. Returns the new id.
   * The caller should immediately call `send` to actually move stock.
   */
  create(input: {
    from_branch_id: string
    to_branch_id:   string
    notes:          string | null
    user_id:        string
    items:          StockTransferLineInput[]
  }): Promise<{ id: string } | { error: string }>

  /** Atomic: decrement source stock + mark in_transit. */
  send(transferId: string, userId: string): Promise<string | null>

  /**
   * Atomic: credit destination stock + mark received.
   *
   * Without overrides, every item is received in full (quantity_received =
   * quantity_sent). With overrides, per-item partial receive + note is
   * recorded. Shortfalls (sent - received) are written off.
   */
  receive(
    transferId: string,
    userId: string,
    overrides?: ReceiveOverride[],
  ): Promise<string | null>

  /** Atomic: restore source stock (if in_transit) + mark cancelled. */
  cancel(transferId: string, userId: string): Promise<string | null>
}

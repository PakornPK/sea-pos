import type { HeldSale, HeldSaleItem } from '@/types/database'

/** Row returned by the list view — includes cashier display name. */
export type HeldSaleListRow = HeldSale & {
  user: { full_name: string | null } | null
}

export interface HeldSaleRepository {
  /** Held bills at a branch, newest first. */
  listForBranch(branchId: string): Promise<HeldSaleListRow[]>

  /** Fetch one — used by resume to pull the cart contents. */
  getById(id: string): Promise<HeldSale | null>

  create(input: {
    branch_id:   string
    user_id:     string
    customer_id: string | null
    items:       HeldSaleItem[]
    note:        string | null
  }): Promise<{ id: string } | { error: string }>

  delete(id: string): Promise<string | null>
}

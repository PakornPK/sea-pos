import type { OptionGroup, OptionGroupWithOptions, ProductOption } from '@/types/database'

export type OptionGroupInput = {
  name:         string
  required:     boolean
  multi_select: boolean
  sort_order?:  number
}

export type ProductOptionInput = {
  name:               string
  price_delta:        number
  sort_order?:        number
  linked_product_id?: string | null
}

export type SaleItemOptionInput = {
  option_id:          string | null
  group_name:         string
  option_name:        string
  price_delta:        number
  linked_product_id?: string | null
}

export interface OptionRepository {
  /** All groups + options for a product. */
  listForProduct(productId: string): Promise<OptionGroupWithOptions[]>

  /** All groups + options for multiple products in one query. Returns a map keyed by productId. */
  listForProducts(productIds: string[]): Promise<Record<string, OptionGroupWithOptions[]>>

  /** Upsert a group; creates if no id, updates if id provided. */
  saveGroup(productId: string, companyId: string, input: OptionGroupInput & { id?: string }): Promise<OptionGroup>

  /** Delete a group (cascades to options). */
  deleteGroup(groupId: string): Promise<void>

  /** Upsert an option inside a group. */
  saveOption(groupId: string, input: ProductOptionInput & { id?: string }): Promise<ProductOption>

  /** Delete a single option. */
  deleteOption(optionId: string): Promise<void>

  /** Insert selected options for a sale item (called after sale_items are inserted). */
  insertSaleItemOptions(
    saleItemId: string,
    options: SaleItemOptionInput[],
  ): Promise<void>

  /**
   * For a completed sale, return the aggregated linked-product stock that needs
   * to be restored on void: { linked_product_id, total_quantity }[].
   * total_quantity = sum(sale_item.quantity) for all items that had this linked option.
   */
  listLinkedStockForSale(saleId: string): Promise<Array<{ linked_product_id: string; total_quantity: number }>>
}

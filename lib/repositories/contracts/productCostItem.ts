import type { ProductCostItem, ProductCostItemInsert } from '@/types/database'

export interface ProductCostItemRepository {
  listForProduct(productId: string): Promise<ProductCostItem[]>
  /** Fetch BOM items for multiple products at once — used by POS at sale time. */
  listForProducts(productIds: string[]): Promise<ProductCostItem[]>
  add(input: ProductCostItemInsert): Promise<{ id: string } | { error: string }>
  update(id: string, input: Partial<Pick<ProductCostItemInsert, 'name' | 'quantity' | 'unit_cost' | 'linked_product_id'>>): Promise<string | null>
  remove(id: string): Promise<string | null>
}

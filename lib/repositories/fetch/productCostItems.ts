import type { ProductCostItemRepository } from '@/lib/repositories/contracts/productCostItem'
import type { ProductCostItem, ProductCostItemInsert } from '@/types/database'
import { restGet, restPost, restPatchById, restDeleteById } from '@/lib/api/rest'

export const fetchProductCostItemRepo: ProductCostItemRepository = {
  async listForProducts(productIds: string[]): Promise<ProductCostItem[]> {
    if (!productIds.length) return []
    return restGet<ProductCostItem[]>('product_cost_items', {
      product_id: `in.(${productIds.join(',')})`,
      order:      ['sort_order.asc', 'created_at.asc'],
    })
  },

  async listForProduct(productId: string): Promise<ProductCostItem[]> {
    return restGet<ProductCostItem[]>('product_cost_items', {
      product_id: `eq.${productId}`,
      order:      ['sort_order.asc', 'created_at.asc'],
    })
  },

  async add(input: ProductCostItemInsert): Promise<{ id: string } | { error: string }> {
    try {
      const rows = await restPost<Array<{ id: string }>>('product_cost_items', {
        product_id:        input.product_id,
        name:              input.name,
        quantity:          input.quantity,
        unit_cost:         input.unit_cost,
        linked_product_id: input.linked_product_id ?? null,
        sort_order:        input.sort_order ?? 0,
      })
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      if (!row?.id) return { error: 'บันทึกไม่สำเร็จ' }
      return { id: row.id }
    } catch (e) {
      return { error: String(e) }
    }
  },

  async update(id: string, input): Promise<string | null> {
    try {
      await restPatchById('product_cost_items', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async remove(id: string): Promise<string | null> {
    try {
      await restDeleteById('product_cost_items', id)
      return null
    } catch (e) {
      return String(e)
    }
  },
}

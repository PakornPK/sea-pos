import type { ProductCostItemRepository } from '@/lib/repositories/contracts/productCostItem'
import type { ProductCostItem, ProductCostItemInsert } from '@/types/database'
import { getDb } from './db'

export const supabaseProductCostItemRepo: ProductCostItemRepository = {
  async listForProducts(productIds: string[]): Promise<ProductCostItem[]> {
    if (!productIds.length) return []
    const db = await getDb()
    const { data } = await db
      .from('product_cost_items')
      .select('*')
      .in('product_id', productIds)
      .order('sort_order')
      .order('created_at')
    return (data ?? []) as ProductCostItem[]
  },

  async listForProduct(productId: string): Promise<ProductCostItem[]> {
    const db = await getDb()
    const { data } = await db
      .from('product_cost_items')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order')
      .order('created_at')
    return (data ?? []) as ProductCostItem[]
  },

  async add(input: ProductCostItemInsert): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('product_cost_items')
      .insert({
        product_id:        input.product_id,
        name:              input.name,
        quantity:          input.quantity,
        unit_cost:         input.unit_cost,
        linked_product_id: input.linked_product_id ?? null,
        sort_order:        input.sort_order ?? 0,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { id: (data as { id: string }).id }
  },

  async update(id: string, input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('product_cost_items')
      .update(input)
      .eq('id', id)
    return error?.message ?? null
  },

  async remove(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('product_cost_items')
      .delete()
      .eq('id', id)
    return error?.message ?? null
  },
}

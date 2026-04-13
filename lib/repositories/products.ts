import type { DB } from './types'
import type {
  Product, ProductInsert, ProductWithCategory,
} from '@/types/database'

export const productRepo = {
  async listAll(db: DB): Promise<Product[]> {
    const { data } = await db.from('products').select('*').order('name')
    return (data ?? []) as Product[]
  },

  async listWithCategory(db: DB): Promise<ProductWithCategory[]> {
    const { data } = await db
      .from('products')
      .select('*, category:categories(id, name)')
      .order('name')
    return (data ?? []) as ProductWithCategory[]
  },

  async listInStock(db: DB): Promise<Product[]> {
    const { data } = await db
      .from('products').select('*').gt('stock', 0).order('name')
    return (data ?? []) as Product[]
  },

  async getStock(db: DB, id: string): Promise<number | null> {
    const { data } = await db
      .from('products').select('stock').eq('id', id).single()
    return data?.stock ?? null
  },

  async create(db: DB, input: ProductInsert): Promise<{ id: string } | { error: string }> {
    const { data, error } = await db
      .from('products').insert(input).select('id').single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  /**
   * Full insert returning the created row — used by quickCreateProduct so
   * the client can append the product to local state without refetching.
   */
  async createReturning(db: DB, input: ProductInsert): Promise<Product | { error: string }> {
    const { data, error } = await db
      .from('products').insert(input)
      .select('id, sku, name, price, cost, stock, min_stock, category_id, image_url, created_at')
      .single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return {
      ...data,
      price: Number(data.price),
      cost: Number(data.cost),
    } as Product
  },

  async updateStock(db: DB, id: string, newStock: number): Promise<string | null> {
    const { error } = await db
      .from('products').update({ stock: newStock }).eq('id', id)
    return error?.message ?? null
  },

  async delete(db: DB, id: string): Promise<string | null> {
    const { error } = await db.from('products').delete().eq('id', id)
    return error?.message ?? null
  },

  /** RPC: auto-generate SKU from the product's category prefix. */
  async nextSkuForCategory(db: DB, categoryId: string): Promise<string | null> {
    const { data } = await db.rpc('next_sku_for_category', { p_category_id: categoryId })
    return (data as string | null) ?? null
  },

  /** RPC: atomic stock decrement for POS (SECURITY DEFINER). */
  async decrementStock(
    db: DB,
    input: { productId: string; quantity: number; saleId: string; userId: string }
  ): Promise<string | null> {
    const { error } = await db.rpc('decrement_stock', {
      p_product_id: input.productId,
      p_quantity:   input.quantity,
      p_sale_id:    input.saleId,
      p_user_id:    input.userId,
    })
    return error?.message ?? null
  },
}

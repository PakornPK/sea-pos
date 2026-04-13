import type {
  Product, ProductInsert, ProductWithCategory,
} from '@/types/database'
import { toSupabaseRange, packPaginated, type PageParams, type Paginated } from '@/lib/pagination'
import type { ProductRepository } from '@/lib/repositories/contracts'
import { getDb } from './db'

export const supabaseProductRepo: ProductRepository = {
  async listAll(): Promise<Product[]> {
    const db = await getDb()
    const { data } = await db.from('products').select('*').order('name')
    return (data ?? []) as Product[]
  },

  async listWithCategory(): Promise<ProductWithCategory[]> {
    const db = await getDb()
    const { data } = await db
      .from('products')
      .select('*, category:categories(id, name)')
      .order('name')
    return (data ?? []) as ProductWithCategory[]
  },

  async listInStock(): Promise<Product[]> {
    const db = await getDb()
    const { data } = await db
      .from('products').select('*').gt('stock', 0).order('name')
    return (data ?? []) as Product[]
  },

  async listWithCategoryPaginated(
    p: PageParams,
    opts: { categoryId?: string | null } = {}
  ): Promise<Paginated<ProductWithCategory>> {
    const db = await getDb()
    const { from, to } = toSupabaseRange(p)
    let q = db
      .from('products')
      .select('*, category:categories(id, name)', { count: 'exact' })
      .order('name')
      .range(from, to)
    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)

    const { data, count } = await q
    return packPaginated((data ?? []) as ProductWithCategory[], count ?? 0, p)
  },

  async getStock(id: string): Promise<number | null> {
    const db = await getDb()
    const { data } = await db
      .from('products').select('stock').eq('id', id).single()
    return data?.stock ?? null
  },

  async create(input: ProductInsert): Promise<{ id: string } | { error: string }> {
    const db = await getDb()
    const { data, error } = await db
      .from('products').insert(input).select('id').single()
    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }
    return { id: data.id }
  },

  async createReturning(input: ProductInsert): Promise<Product | { error: string }> {
    const db = await getDb()
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

  async updateStock(id: string, newStock: number): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('products').update({ stock: newStock }).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('products').delete().eq('id', id)
    return error?.message ?? null
  },

  async nextSkuForCategory(categoryId: string): Promise<string | null> {
    const db = await getDb()
    const { data } = await db.rpc('next_sku_for_category', { p_category_id: categoryId })
    return (data as string | null) ?? null
  },

  async decrementStock(input): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.rpc('decrement_stock', {
      p_product_id: input.productId,
      p_quantity:   input.quantity,
      p_sale_id:    input.saleId,
      p_user_id:    input.userId,
    })
    return error?.message ?? null
  },
}

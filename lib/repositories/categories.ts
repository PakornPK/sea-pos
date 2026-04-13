import type { DB } from './types'
import type { Category } from '@/types/database'

export const categoryRepo = {
  async list(db: DB): Promise<Category[]> {
    const { data } = await db.from('categories').select('*').order('name')
    return (data ?? []) as Category[]
  },

  async create(
    db: DB,
    input: { name: string; sku_prefix: string | null }
  ): Promise<string | null> {
    const { error } = await db.from('categories').insert(input)
    return error?.message ?? null
  },

  async updatePrefix(
    db: DB,
    id: string,
    skuPrefix: string | null
  ): Promise<string | null> {
    const { error } = await db.from('categories')
      .update({ sku_prefix: skuPrefix }).eq('id', id)
    return error?.message ?? null
  },

  async delete(db: DB, id: string): Promise<string | null> {
    const { error } = await db.from('categories').delete().eq('id', id)
    return error?.message ?? null
  },
}

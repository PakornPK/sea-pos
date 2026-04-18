import { unstable_cache } from 'next/cache'
import type { Category } from '@/types/database'
import type { CategoryRepository } from '@/lib/repositories/contracts'
import { getDb, getAdminDb } from './db'

export const supabaseCategoryRepo: CategoryRepository = {
  async list(): Promise<Category[]> {
    const db = await getDb()
    const { data } = await db.from('categories').select('*').order('name')
    return (data ?? []) as Category[]
  },

  listCached(companyId: string): Promise<Category[]> {
    return unstable_cache(
      async (): Promise<Category[]> => {
        const { data } = await getAdminDb()
          .from('categories').select('*').eq('company_id', companyId).order('name')
        return (data ?? []) as Category[]
      },
      ['categories', companyId],
      { tags: [`categories:${companyId}`] },
    )()
  },

  async create(input: { name: string; sku_prefix: string | null; vat_exempt?: boolean }): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('categories').insert(input)
    return error?.message ?? null
  },

  async updatePrefix(id: string, skuPrefix: string | null): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('categories')
      .update({ sku_prefix: skuPrefix }).eq('id', id)
    return error?.message ?? null
  },

  async updateVatExempt(id: string, vatExempt: boolean): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('categories')
      .update({ vat_exempt: vatExempt }).eq('id', id)
    return error?.message ?? null
  },

  async updateCategoryType(id, categoryType): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('categories')
      .update({ category_type: categoryType }).eq('id', id)
    return error?.message ?? null
  },

  async delete(id: string): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('categories').delete().eq('id', id)
    return error?.message ?? null
  },
}

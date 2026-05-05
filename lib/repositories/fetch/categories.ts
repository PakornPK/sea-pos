import type { Category } from '@/types/database'
import type { CategoryRepository } from '@/lib/repositories/contracts'
import { restGet, restPost, restPatchById, restDeleteById } from '@/lib/api/rest'

export const fetchCategoryRepo: CategoryRepository = {
  async list(): Promise<Category[]> {
    return restGet<Category[]>('categories', { order: 'name.asc' })
  },

  listCached(_companyId: string): Promise<Category[]> {
    return restGet<Category[]>('categories', { order: 'name.asc' })
  },

  async create(input): Promise<string | null> {
    try {
      await restPost('categories', input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updatePrefix(id, skuPrefix): Promise<string | null> {
    try {
      await restPatchById('categories', id, { sku_prefix: skuPrefix })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateVatExempt(id, vatExempt): Promise<string | null> {
    try {
      await restPatchById('categories', id, { vat_exempt: vatExempt })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateCategoryType(id, categoryType): Promise<string | null> {
    try {
      await restPatchById('categories', id, { category_type: categoryType })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async delete(id): Promise<string | null> {
    try {
      await restDeleteById('categories', id)
      return null
    } catch (e) {
      return String(e)
    }
  },
}

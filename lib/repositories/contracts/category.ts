import type { Category } from '@/types/database'

export interface CategoryRepository {
  list(): Promise<Category[]>
  create(input: { name: string; sku_prefix: string | null }): Promise<string | null>
  updatePrefix(id: string, skuPrefix: string | null): Promise<string | null>
  delete(id: string): Promise<string | null>
}

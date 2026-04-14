import type { Category } from '@/types/database'

export interface CategoryRepository {
  list(): Promise<Category[]>
  create(input: { name: string; sku_prefix: string | null; vat_exempt?: boolean }): Promise<string | null>
  updatePrefix(id: string, skuPrefix: string | null): Promise<string | null>
  updateVatExempt(id: string, vatExempt: boolean): Promise<string | null>
  delete(id: string): Promise<string | null>
}

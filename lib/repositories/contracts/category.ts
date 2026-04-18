import type { Category, CategoryType } from '@/types/database'

export interface CategoryRepository {
  list(): Promise<Category[]>
  /**
   * Cross-request cached list scoped to a company (service-role).
   * Invalidate with revalidateTag(`categories:${companyId}`).
   */
  listCached(companyId: string): Promise<Category[]>
  create(input: { name: string; sku_prefix: string | null; vat_exempt?: boolean; category_type?: CategoryType }): Promise<string | null>
  updatePrefix(id: string, skuPrefix: string | null): Promise<string | null>
  updateVatExempt(id: string, vatExempt: boolean): Promise<string | null>
  updateCategoryType(id: string, categoryType: CategoryType): Promise<string | null>
  delete(id: string): Promise<string | null>
}

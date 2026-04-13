import type { Product, ProductInsert, ProductWithCategory } from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export interface ProductRepository {
  countAll(): Promise<number>
  listAll(): Promise<Product[]>
  listWithCategory(): Promise<ProductWithCategory[]>
  listInStock(): Promise<Product[]>
  listWithCategoryPaginated(
    p: PageParams,
    opts?: { categoryId?: string | null }
  ): Promise<Paginated<ProductWithCategory>>
  getStock(id: string): Promise<number | null>
  create(input: ProductInsert): Promise<{ id: string } | { error: string }>
  createReturning(input: ProductInsert): Promise<Product | { error: string }>
  updateStock(id: string, newStock: number): Promise<string | null>
  delete(id: string): Promise<string | null>
  nextSkuForCategory(categoryId: string): Promise<string | null>
  decrementStock(input: {
    productId: string
    quantity: number
    saleId: string
    userId: string
  }): Promise<string | null>
}

import type {
  Product, ProductInsert, ProductWithCategory, ProductWithStock, ProductWithStockAndCategory,
} from '@/types/database'
import type { PageParams, Paginated } from '@/lib/pagination'

export interface ProductRepository {
  countAll(): Promise<number>
  listAll(): Promise<Product[]>
  listWithCategory(): Promise<ProductWithCategory[]>
  listWithCategoryPaginated(
    p: PageParams,
    opts?: { categoryId?: string | null }
  ): Promise<Paginated<ProductWithCategory>>

  // ─── Branch-aware stock views ─────────────────────────────────
  /** Products with stock > 0 at the given branch — POS home. */
  listInStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; search?: string | null }
  ): Promise<Paginated<ProductWithStock>>

  /** Every product in the company, joined with its stock at the given branch
   *  (0 when the pivot row is missing). Inventory table home. */
  listWithStockForBranch(
    branchId: string,
    opts?: { search?: string | null; categoryId?: string | null }
  ): Promise<ProductWithStockAndCategory[]>

  /** Paginated variant of listWithStockForBranch — backs the inventory table. */
  listWithStockForBranchPaginated(
    p: PageParams,
    opts: { branchId: string; categoryId?: string | null; search?: string | null }
  ): Promise<Paginated<ProductWithStockAndCategory>>

  /**
   * Admin cross-branch view. Returns one row per product with `stock` = sum
   * across every branch in the company and a `stock_by_branch` breakdown.
   */
  listWithStockByBranchPaginated(
    p: PageParams,
    opts?: { categoryId?: string | null; search?: string | null }
  ): Promise<Paginated<ProductWithStockAndCategory>>

  create(input: ProductInsert): Promise<{ id: string } | { error: string }>
  createReturning(input: ProductInsert): Promise<Product | { error: string }>

  updateImageUrl(id: string, url: string | null): Promise<string | null>
  delete(id: string): Promise<string | null>
  nextSkuForCategory(categoryId: string): Promise<string | null>

  /**
   * Effective VAT-exempt flag per product id = product.vat_exempt OR its
   * category.vat_exempt. Used by the sale action to recompute VAT server-side
   * (don't trust a client-supplied flag).
   */
  vatExemptMap(productIds: string[]): Promise<Record<string, boolean>>
}

/**
 * ProductStockRepository — operations on the `product_stock` pivot.
 * Stock quantities for products are exclusively read/written here.
 */
export interface ProductStockRepository {
  /** Stock at (product, branch). null when no row exists. */
  get(productId: string, branchId: string): Promise<number | null>

  /** Upsert the exact quantity. Used by admin-adjust flows. */
  set(productId: string, branchId: string, quantity: number): Promise<string | null>

  /**
   * Seed a pivot row at qty=0 for a new product at the given branch.
   * Idempotent — ON CONFLICT DO NOTHING.
   */
  seed(productId: string, branchId: string): Promise<string | null>

  /**
   * Manager stock adjustment. Reads current → validates non-negative →
   * updates pivot → inserts stock_log with `reason` and `user_id`.
   * Returns error string or null.
   */
  adjust(input: {
    productId: string
    branchId:  string
    delta:     number
    reason:    string
    userId:    string
  }): Promise<string | null>

  /** Atomic stock decrement for sales — calls the `decrement_stock` RPC. */
  decrement(input: {
    productId: string
    branchId:  string
    quantity:  number
    saleId:    string
    userId:    string
  }): Promise<string | null>

  /** Stock rows for a single product across every branch. */
  listForProduct(productId: string): Promise<Array<{
    branch_id:    string
    branch_name:  string
    quantity:     number
  }>>

  /** Products with stock ≤ min_stock at a branch, ordered by deficit. */
  lowStock(branchId: string, limit?: number): Promise<Array<{
    id:         string
    name:       string
    sku:        string | null
    stock:      number
    min_stock:  number
  }>>
}

/**
 * The Supabase adapter — one concrete implementation of `Repositories`.
 *
 * To add another backend (REST API, Prisma, in-memory mock for tests),
 * create a sibling folder next to this one (e.g. `lib/repositories/rest/`)
 * with parallel `products.ts`, `customers.ts`, ... files that each export
 * an object implementing the corresponding interface from `../contracts/`.
 * Then build an aggregate `restRepos: Repositories` just like this file,
 * and flip the import in `lib/repositories/index.ts`.
 */

import type { Repositories } from '@/lib/repositories/contracts'
import { fetchStorageRepo }           from '@/lib/repositories/fetch/storage'
// All repos: fetch implementations (raw REST to Rust backend)
import { fetchAnalyticsRepo }        from '@/lib/repositories/fetch/analytics'
import { fetchCompanyRepo }          from '@/lib/repositories/fetch/companies'
import { fetchPlanRepo }             from '@/lib/repositories/fetch/plans'
import { fetchBranchRepo }           from '@/lib/repositories/fetch/branches'
import { fetchProductRepo }          from '@/lib/repositories/fetch/products'
import { fetchProductStockRepo }     from '@/lib/repositories/fetch/productStock'
import { fetchCategoryRepo }         from '@/lib/repositories/fetch/categories'
import { fetchSupplierRepo }         from '@/lib/repositories/fetch/suppliers'
import { fetchSaleRepo }             from '@/lib/repositories/fetch/sales'
import { fetchPurchaseOrderRepo }    from '@/lib/repositories/fetch/purchaseOrders'
import { fetchStockLogRepo }         from '@/lib/repositories/fetch/stockLogs'
import { fetchStockTransferRepo }    from '@/lib/repositories/fetch/stockTransfers'
import { fetchUserRepo }             from '@/lib/repositories/fetch/users'
import { fetchHeldSaleRepo }         from '@/lib/repositories/fetch/heldSales'
import { fetchBillingRepo }          from '@/lib/repositories/fetch/billing'
import { fetchLoyaltyRepo }          from '@/lib/repositories/fetch/loyalty'
import { fetchOptionRepo }           from '@/lib/repositories/fetch/options'
import { fetchProductCostItemRepo }  from '@/lib/repositories/fetch/productCostItems'

export const supabaseRepos: Repositories = {
  company:         fetchCompanyRepo,
  plan:            fetchPlanRepo,
  storage:         fetchStorageRepo,
  branch:          fetchBranchRepo,
  product:         fetchProductRepo,
  productStock:    fetchProductStockRepo,
  category:        fetchCategoryRepo,
  supplier:        fetchSupplierRepo,
  sale:            fetchSaleRepo,
  purchaseOrder:   fetchPurchaseOrderRepo,
  stockLog:        fetchStockLogRepo,
  stockTransfer:   fetchStockTransferRepo,
  user:            fetchUserRepo,
  analytics:       fetchAnalyticsRepo,
  heldSale:        fetchHeldSaleRepo,
  billing:         fetchBillingRepo,
  loyalty:         fetchLoyaltyRepo,
  option:          fetchOptionRepo,
  productCostItem: fetchProductCostItemRepo,
}

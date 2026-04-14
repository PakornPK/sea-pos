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
import { supabaseCompanyRepo }       from './companies'
import { supabasePlanRepo }          from './plans'
import { supabaseStorageRepo }       from './storage'
import { supabaseBranchRepo }        from './branches'
import { supabaseProductRepo }       from './products'
import { supabaseProductStockRepo }  from './productStock'
import { supabaseCategoryRepo }      from './categories'
import { supabaseCustomerRepo }      from './customers'
import { supabaseSupplierRepo }      from './suppliers'
import { supabaseSaleRepo }          from './sales'
import { supabasePurchaseOrderRepo } from './purchaseOrders'
import { supabaseStockLogRepo }      from './stockLogs'
import { supabaseStockTransferRepo } from './stockTransfers'
import { supabaseUserRepo }          from './users'
import { supabaseAuthRepo }          from './auth'
import { supabaseAnalyticsRepo }     from './analytics'
import { supabaseHeldSaleRepo }      from './heldSales'

export const supabaseRepos: Repositories = {
  company:       supabaseCompanyRepo,
  plan:          supabasePlanRepo,
  storage:       supabaseStorageRepo,
  branch:        supabaseBranchRepo,
  product:       supabaseProductRepo,
  productStock:  supabaseProductStockRepo,
  category:      supabaseCategoryRepo,
  customer:      supabaseCustomerRepo,
  supplier:      supabaseSupplierRepo,
  sale:          supabaseSaleRepo,
  purchaseOrder: supabasePurchaseOrderRepo,
  stockLog:      supabaseStockLogRepo,
  stockTransfer: supabaseStockTransferRepo,
  user:          supabaseUserRepo,
  auth:          supabaseAuthRepo,
  analytics:     supabaseAnalyticsRepo,
  heldSale:      supabaseHeldSaleRepo,
}

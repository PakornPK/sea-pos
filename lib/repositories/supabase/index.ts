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
import { supabaseProductRepo }       from './products'
import { supabaseCategoryRepo }      from './categories'
import { supabaseCustomerRepo }      from './customers'
import { supabaseSupplierRepo }      from './suppliers'
import { supabaseSaleRepo }          from './sales'
import { supabasePurchaseOrderRepo } from './purchaseOrders'
import { supabaseStockLogRepo }      from './stockLogs'
import { supabaseUserRepo }          from './users'
import { supabaseAuthRepo }          from './auth'
import { supabaseAnalyticsRepo }     from './analytics'

export const supabaseRepos: Repositories = {
  company:       supabaseCompanyRepo,
  product:       supabaseProductRepo,
  category:      supabaseCategoryRepo,
  customer:      supabaseCustomerRepo,
  supplier:      supabaseSupplierRepo,
  sale:          supabaseSaleRepo,
  purchaseOrder: supabasePurchaseOrderRepo,
  stockLog:      supabaseStockLogRepo,
  user:          supabaseUserRepo,
  auth:          supabaseAuthRepo,
  analytics:     supabaseAnalyticsRepo,
}

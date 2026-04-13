/**
 * Repository façade — the single import point for the rest of the app.
 *
 * Pages / actions / components import named repos from here. They are
 * typed against the interfaces in `contracts/`, not any specific
 * implementation. The line below is the ONLY place that binds the app
 * to a concrete adapter — swap it out to switch backends.
 *
 *   import { supabaseRepos }  from './supabase'
 *   import { restApiRepos }   from './rest'      // future
 *   import { inMemoryRepos }  from './in-memory' // tests
 *
 *   const activeRepos: Repositories = supabaseRepos
 */

import type { Repositories } from './contracts'
import { supabaseRepos } from './supabase'

// Single wiring point — change THIS LINE to swap the entire backend.
const repos: Repositories = supabaseRepos

export const companyRepo       = repos.company
export const productRepo       = repos.product
export const categoryRepo      = repos.category
export const customerRepo      = repos.customer
export const supplierRepo      = repos.supplier
export const saleRepo          = repos.sale
export const purchaseOrderRepo = repos.purchaseOrder
export const stockLogRepo      = repos.stockLog
export const userRepo          = repos.user
export const authRepo          = repos.auth
export const analyticsRepo     = repos.analytics

// Also re-export contract types so callers never need to reach into contracts/
export type {
  Repositories,
  CustomerInput,
  SupplierInput,
  POLineInput,
  POListRow,
  SaleListRow,
  UserListRow,
  TodaySummary,
  DailySeriesPoint,
  PaymentMixPoint,
  TopProduct,
  LowStockItem,
  RecentSale,
  InventoryValueByCategory,
  StockMovement,
} from './contracts'

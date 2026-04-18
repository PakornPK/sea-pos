/**
 * Repository contracts — the ports of our hexagonal architecture.
 *
 * Callers (pages, server actions, components) depend ONLY on these
 * interfaces. Swapping backends means implementing these interfaces
 * with a different adapter (REST API client, Prisma, gRPC, mock, …)
 * and wiring it into `lib/repositories/index.ts`.
 *
 * Rules:
 *   - Contracts never import from @/lib/supabase/* — they are pure types.
 *   - Method signatures use domain types from @/types/database.ts.
 *   - No database specifics (connection, query builders) leak into here.
 */

export type { CompanyRepository, CompanyListRow } from './company'
export type { PlanRepository, PlanInput, PlanWithUsage } from './plan'
export type { StorageRepository, StorageBucket, UploadResult } from './storage'
export type { BranchRepository }         from './branch'
export type { ProductRepository, ProductStockRepository } from './product'
export type { CategoryRepository }       from './category'
export type { CustomerRepository, CustomerInput } from './customer'
export type { SupplierRepository, SupplierInput } from './supplier'
export type {
  SaleRepository, SaleListRow, SaleSummaryForStats, SaleDetail, SaleItemWithProduct,
} from './sale'
export type {
  PurchaseOrderRepository, POListRow, POLineInput, POItemWithProduct,
} from './purchaseOrder'
export type { StockLogRepository }       from './stockLog'
export type {
  StockTransferRepository, StockTransferLineInput, StockTransferListRow,
  StockTransferDetail, StockTransferItemWithProduct, ReceiveOverride,
} from './stockTransfer'
export type { UserRepository, UserListRow } from './user'
export type { HeldSaleRepository, HeldSaleListRow } from './heldSale'
export type { AuthRepository }           from './auth'
export type {
  BillingRepository,
  PlatformSettingsInput,
  SubscriptionInput,
  RecordPaymentInput,
  IssueInvoiceInput,
  InvoiceListRow,
  SubscriptionListRow,
  PlatformDashboardSummary,
} from './billing'
export type { ProductCostItemRepository } from './productCostItem'
export type {
  OptionRepository,
  OptionGroupInput,
  ProductOptionInput,
  SaleItemOptionInput,
} from './options'
export type {
  LoyaltyRepository,
  MembershipSettingsInput,
  MembershipTierInput,
  EnrollMemberInput,
  AwardPointsInput,
  MemberListRow,
  MemberWithDetails,
  LoyaltySummary,
  TierStat,
  TopMemberRow,
} from './loyalty'
export type {
  AnalyticsRepository,
  TodaySummary,
  DailySeriesPoint,
  PaymentMixPoint,
  TopProduct,
  LowStockItem,
  RecentSale,
  InventoryValueByCategory,
  StockMovement,
  SalesByRangeSummary,
  SalesRowForExport,
  VatSummary,
  PurchaseVatSummary,
  PurchaseRowForExport,
} from './analytics'

import type { CompanyRepository }         from './company'
import type { PlanRepository }            from './plan'
import type { StorageRepository }         from './storage'
import type { BranchRepository }          from './branch'
import type { ProductRepository, ProductStockRepository } from './product'
import type { CategoryRepository }        from './category'
import type { CustomerRepository }        from './customer'
import type { SupplierRepository }        from './supplier'
import type { SaleRepository }            from './sale'
import type { PurchaseOrderRepository }   from './purchaseOrder'
import type { StockLogRepository }        from './stockLog'
import type { StockTransferRepository }   from './stockTransfer'
import type { UserRepository }            from './user'
import type { AuthRepository }            from './auth'
import type { AnalyticsRepository }       from './analytics'
import type { HeldSaleRepository }        from './heldSale'
import type { BillingRepository }         from './billing'
import type { LoyaltyRepository }         from './loyalty'
import type { OptionRepository }          from './options'
import type { ProductCostItemRepository } from './productCostItem'

/** Aggregate type — an adapter implements all of these to be a valid backend. */
export interface Repositories {
  company:       CompanyRepository
  plan:          PlanRepository
  storage:       StorageRepository
  branch:        BranchRepository
  product:       ProductRepository
  productStock:  ProductStockRepository
  category:      CategoryRepository
  customer:      CustomerRepository
  supplier:      SupplierRepository
  sale:          SaleRepository
  purchaseOrder: PurchaseOrderRepository
  stockLog:      StockLogRepository
  stockTransfer: StockTransferRepository
  user:          UserRepository
  auth:          AuthRepository
  analytics:     AnalyticsRepository
  heldSale:      HeldSaleRepository
  billing:       BillingRepository
  loyalty:          LoyaltyRepository
  option:           OptionRepository
  productCostItem:  ProductCostItemRepository
}

import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { productRepo, companyRepo, customerRepo, optionRepo } from '@/lib/repositories'
import { listHeldSales } from '@/lib/actions/heldSales'
import { POSTerminal } from '@/components/pos/POSTerminal'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getVatConfig, DEFAULT_VAT_CONFIG } from '@/lib/vat'

export const metadata: Metadata = {
  title: 'ขายสินค้า | SEA-POS',
}

export default async function POSPage() {
  const { me } = await requirePageRole(['admin', 'manager', 'cashier'])

  const initialPagePromise = me.activeBranchId
    ? productRepo.listInStockForBranchPaginated(
        { page: 1, pageSize: DEFAULT_PAGE_SIZE },
        { branchId: me.activeBranchId },
      )
    : Promise.resolve({ rows: [], totalCount: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, totalPages: 1 })

  const [initialPage, customers, company, initialHeldSales] = await Promise.all([
    initialPagePromise,
    me.companyId ? customerRepo.listForPickerCached(me.companyId) : Promise.resolve([]),
    me.companyId ? companyRepo.getByIdCached(me.companyId) : Promise.resolve(null),
    listHeldSales(),
  ])
  const vatConfig = company ? getVatConfig(company) : DEFAULT_VAT_CONFIG

  // Preload option groups for all products with options on the initial page
  const hasOptionsIds = initialPage.rows
    .filter((p) => p.has_options)
    .map((p) => p.id)
  const initialOptionsMap = hasOptionsIds.length
    ? await optionRepo.listForProducts(hasOptionsIds)
    : {}

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="shrink-0 text-[26px] font-bold tracking-tight">ขายสินค้า</h1>
      <div className="min-h-0 flex-1">
        <POSTerminal
          initialProducts={initialPage.rows}
          initialTotal={initialPage.totalCount}
          initialPage={initialPage.page}
          pageSize={initialPage.pageSize}
          customers={customers}
          vatConfig={vatConfig}
          initialHeldSales={initialHeldSales}
          initialOptionsMap={initialOptionsMap}
        />
      </div>
    </div>
  )
}

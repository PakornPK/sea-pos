import type { Metadata } from 'next'
import { requirePageRole } from '@/lib/auth'
import { productRepo, customerRepo, companyRepo } from '@/lib/repositories'
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

  const [initialPage, customers, company] = await Promise.all([
    initialPagePromise,
    customerRepo.listForPicker(),
    companyRepo.getCurrent(),
  ])
  const vatConfig = company ? getVatConfig(company) : DEFAULT_VAT_CONFIG

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="shrink-0 text-2xl font-semibold">ขายสินค้า</h1>
      <div className="min-h-0 flex-1">
        <POSTerminal
          initialProducts={initialPage.rows}
          initialTotal={initialPage.totalCount}
          initialPage={initialPage.page}
          pageSize={initialPage.pageSize}
          customers={customers}
          vatConfig={vatConfig}
        />
      </div>
    </div>
  )
}

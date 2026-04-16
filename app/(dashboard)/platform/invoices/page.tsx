import type { Metadata } from 'next'
import { requirePlatformAdmin } from '@/lib/auth'
import { billingRepo } from '@/lib/repositories'
import { InvoiceList } from '@/components/platform/InvoiceList'

export const metadata: Metadata = {
  title: 'ใบกำกับภาษี | SEA-POS Platform',
}

export default async function InvoicesPage() {
  await requirePlatformAdmin()
  const invoices = await billingRepo.listInvoices()

  const totalIssued = invoices.filter((i) => i.status === 'issued').reduce((s, i) => s + i.total_baht, 0)
  const countIssued = invoices.filter((i) => i.status === 'issued').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">ใบกำกับภาษี</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            รายการใบกำกับภาษีทั้งหมดที่ออกให้ลูกค้า
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[26px] font-bold tabular-nums tracking-tight">
            ฿{totalIssued.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[12px] text-muted-foreground">{countIssued} ใบ ที่ยังมีผล</span>
        </div>
      </div>

      <InvoiceList invoices={invoices} showCompany />
    </div>
  )
}

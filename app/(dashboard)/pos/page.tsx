'use client'

import { useAuth } from '@/lib/auth-client'
import { POSTerminal } from '@/components/pos/POSTerminal'
import { DEFAULT_VAT_CONFIG } from '@/lib/vat'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'

export default function POSPage() {
  const { user } = useAuth()

  if (!user) return null  // AuthGuard handles redirect

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h1 className="shrink-0 text-[26px] font-bold tracking-tight">ขายสินค้า</h1>
      <div className="min-h-0 flex-1">
        <POSTerminal
          initialProducts={[]}
          initialTotal={0}
          initialPage={1}
          pageSize={DEFAULT_PAGE_SIZE}
          vatConfig={DEFAULT_VAT_CONFIG}
          initialHeldSales={[]}
          initialOptionsMap={{}}
        />
      </div>
    </div>
  )
}

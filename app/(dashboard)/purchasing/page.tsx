import type { Metadata } from 'next'
import { Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'จัดซื้อ | SEA-POS',
}

export default function PurchasingPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">จัดซื้อ</h1>
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Truck className="h-10 w-10 opacity-40" />
        <p>โมดูลนี้กำลังพัฒนา</p>
      </div>
    </div>
  )
}

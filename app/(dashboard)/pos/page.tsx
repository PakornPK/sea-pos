import type { Metadata } from 'next'
import { ShoppingCart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'ขายสินค้า | SEA-POS',
}

export default function POSPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">ขายสินค้า (POS)</h1>
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <ShoppingCart className="h-10 w-10 opacity-40" />
        <p>โมดูลนี้กำลังพัฒนา</p>
      </div>
    </div>
  )
}

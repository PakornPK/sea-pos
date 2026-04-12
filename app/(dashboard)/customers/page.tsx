import type { Metadata } from 'next'
import { Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'ลูกค้า | SEA-POS',
}

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">ลูกค้า</h1>
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Users className="h-10 w-10 opacity-40" />
        <p>โมดูลนี้กำลังพัฒนา</p>
      </div>
    </div>
  )
}

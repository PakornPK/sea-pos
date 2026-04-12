import type { Metadata } from 'next'
import { BarChart2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'รายงาน | SEA-POS',
}

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">รายงาน</h1>
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <BarChart2 className="h-10 w-10 opacity-40" />
        <p>โมดูลนี้กำลังพัฒนา</p>
      </div>
    </div>
  )
}

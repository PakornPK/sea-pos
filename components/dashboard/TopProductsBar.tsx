'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { TopProduct } from '@/lib/repositories'

export function TopProductsBar({ data }: { data: TopProduct[] }) {
  const chartData = [...data].reverse().map((d) => ({
    name: d.name.length > 22 ? d.name.slice(0, 22) + '…' : d.name,
    revenue: Math.round(d.revenue),
    quantity: d.quantity,
  }))

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold text-sm mb-3">สินค้าขายดี 5 อันดับ (30 วัน)</h3>
      {chartData.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip
              formatter={(value, _name, item) => {
                const v = Number(value ?? 0)
                const p = (item as { payload?: { quantity: number } }).payload
                return [
                  `฿${v.toLocaleString('th-TH')} (${p?.quantity ?? 0} ชิ้น)`,
                  'รายได้',
                ]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

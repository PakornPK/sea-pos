'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailySeriesPoint } from '@/lib/repositories'

export function RevenueTrendChart({ data }: { data: DailySeriesPoint[] }) {
  const chartData = data.map((d) => ({
    day: new Date(d.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
    revenue: Math.round(d.revenue),
    count: d.count,
  }))

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-sm">ยอดขายรายวัน (7 วัน)</h3>
        <p className="text-xs text-muted-foreground">
          รวม ฿{chartData.reduce((s, d) => s + d.revenue, 0).toLocaleString('th-TH')}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => `฿${v.toLocaleString('th-TH')}`} />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value ?? 0)
              return name === 'revenue'
                ? [`฿${v.toLocaleString('th-TH')}`, 'รายได้']
                : [v, 'บิล']
            }}
            labelStyle={{ fontSize: 12 }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

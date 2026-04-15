'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { PaymentMixPoint } from '@/lib/repositories'
import { PAYMENT_LABEL } from '@/lib/labels'

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981']

export function PaymentMixDonut({ data }: { data: PaymentMixPoint[] }) {
  const chartData = data.map((d) => ({
    name: PAYMENT_LABEL[d.method],
    value: Math.round(d.total),
    count: d.count,
  })).filter((d) => d.value > 0)

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.05] p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-sm">วิธีชำระเงิน (30 วัน)</h3>
        <p className="text-xs text-muted-foreground">รวม ฿{total.toLocaleString('th-TH')}</p>
      </div>
      {chartData.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const v = Number(value ?? 0)
                const p = (item as { payload?: { count: number; name: string } }).payload
                return [
                  `฿${v.toLocaleString('th-TH')} (${p?.count ?? 0} บิล)`,
                  p?.name ?? '',
                ]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Legend
              verticalAlign="bottom"
              height={24}
              iconType="circle"
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

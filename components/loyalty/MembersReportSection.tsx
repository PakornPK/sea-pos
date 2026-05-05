'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { loyaltyRepo } from '@/lib/repositories'
import { parseDateRange } from '@/lib/daterange'
import { formatBaht } from '@/lib/format'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { LucideIcon } from 'lucide-react'
import { Users, Star, TrendingUp, TrendingDown, Wallet, Tag } from 'lucide-react'
import type { LoyaltySummary, TierStat, TopMemberRow } from '@/lib/repositories'

export function MembersReportSection() {
  const searchParams = useSearchParams()
  const sp = {
    start: searchParams.get('start') ?? undefined,
    end:   searchParams.get('end')   ?? undefined,
  }
  const range = parseDateRange(sp, 30)
  const rangeLabel = range.matchingPreset
    ? `${range.matchingPreset} วันล่าสุด`
    : `${range.startDate}  –  ${range.endDate}`

  const [summary, setSummary]     = useState<LoyaltySummary | null>(null)
  const [tierStats, setTierStats] = useState<TierStat[]>([])
  const [topMembers, setTopMembers] = useState<TopMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      loyaltyRepo.getLoyaltySummary(range.startIso, range.endIso),
      loyaltyRepo.getTierStats(),
      loyaltyRepo.getTopMembers(10),
    ])
      .then(([s, t, top]) => { setSummary(s); setTierStats(t); setTopMembers(top) })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startIso, range.endIso])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">รายงานสมาชิก</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{rangeLabel}</p>
        </div>
        <DateRangePicker currentStart={range.startDate} currentEnd={range.endDate} activePreset={range.matchingPreset} />
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : loading || !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[88px] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {(
              [
                { label: 'สมาชิกทั้งหมด',   value: summary.totalMembers.toLocaleString('th-TH'),      icon: Users,        color: 'blue'   },
                { label: 'ใช้งานในช่วงนี้',  value: summary.activeMembers.toLocaleString('th-TH'),     icon: Users,        color: 'green'  },
                { label: 'แต้มที่ออก',        value: summary.pointsIssued.toLocaleString('th-TH'),      icon: TrendingUp,   color: 'green'  },
                { label: 'แต้มที่ใช้',        value: summary.pointsRedeemed.toLocaleString('th-TH'),    icon: TrendingDown, color: 'orange' },
                { label: 'แต้มคงค้าง',        value: summary.pointsOutstanding.toLocaleString('th-TH'), icon: Wallet,       color: 'purple' },
                { label: 'ส่วนลดที่ให้',      value: formatBaht(summary.discountGiven),                 icon: Tag,          color: 'orange' },
              ] as { label: string; value: string; icon: LucideIcon; color: 'blue' | 'green' | 'orange' | 'purple' }[]
            ).map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} icon={card.icon} color={card.color} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-[14px]">การกระจายระดับสมาชิก</h2>
              <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
                {tierStats.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">ยังไม่มีระดับ</p>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ระดับ</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">สมาชิก</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {tierStats.map((t) => (
                        <tr key={t.tier_id ?? 'none'} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {t.tier_color ? (
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.tier_color }} />
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full bg-border shrink-0" />
                              )}
                              {t.tier_name}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{t.count.toLocaleString('th-TH')}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{t.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-3">
              <h2 className="font-semibold text-[14px]">Top 10 ยอดซื้อสูงสุด</h2>
              <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>ระดับ</TableHead>
                      <TableHead className="text-right">ยอดซื้อรวม</TableHead>
                      <TableHead className="text-right">แต้มคงเหลือ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">ยังไม่มีสมาชิก</TableCell>
                      </TableRow>
                    ) : topMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-[13px]">{m.name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">{m.member_no}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.tier_name ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                              style={{ backgroundColor: m.tier_color ?? '#6366f1' }}
                            >
                              <Star className="h-2.5 w-2.5" />
                              {m.tier_name}
                            </span>
                          ) : (
                            <span className="text-[12px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatBaht(m.total_spend_baht)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{m.points_balance.toLocaleString('th-TH')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

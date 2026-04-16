import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/auth'
import { billingRepo } from '@/lib/repositories'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SubscriptionListRow } from '@/lib/repositories'

export const metadata: Metadata = {
  title: 'Subscriptions | SEA-POS',
}

const STATUS_LABEL: Record<string, string> = {
  trialing:  'ทดลองใช้',
  active:    'ปกติ',
  past_due:  'ค้างชำระ',
  suspended: 'ระงับ',
  cancelled: 'ยกเลิก',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  trialing:  'outline',
  active:    'secondary',
  past_due:  'destructive',
  suspended: 'destructive',
  cancelled: 'outline',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function DueBadge({ sub }: { sub: SubscriptionListRow }) {
  if (sub.status === 'cancelled' || sub.status === 'trialing') return null
  if (sub.overdue_months > 0) {
    return (
      <span className="text-[11px] font-medium text-destructive">
        ค้าง {sub.overdue_months} เดือน
      </span>
    )
  }
  const days = daysUntil(sub.current_period_end)
  if (days < 0) {
    return <span className="text-[11px] font-medium text-destructive">หมดอายุแล้ว</span>
  }
  if (days <= 7) {
    return <span className="text-[11px] font-medium text-amber-600">หมด {days} วัน</span>
  }
  return <span className="text-[11px] text-muted-foreground">{days} วัน</span>
}

export default async function SubscriptionsPage() {
  await requirePlatformAdmin()
  const subs = await billingRepo.listSubscriptions()

  // Sort: past_due/suspended first, then by period_end ascending
  const sorted = [...subs].sort((a, b) => {
    const priority = (s: SubscriptionListRow) =>
      s.status === 'suspended' ? 0 :
      s.status === 'past_due'  ? 1 :
      s.overdue_months > 0     ? 2 : 3

    const pd = priority(a) - priority(b)
    if (pd !== 0) return pd
    return new Date(a.current_period_end).getTime() - new Date(b.current_period_end).getTime()
  })

  const counts = {
    active:    subs.filter((s) => s.status === 'active').length,
    trialing:  subs.filter((s) => s.status === 'trialing').length,
    past_due:  subs.filter((s) => s.status === 'past_due').length,
    suspended: subs.filter((s) => s.status === 'suspended').length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Subscriptions</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          {subs.length} บริษัท ·{' '}
          <span className="text-green-600 font-medium">{counts.active} ปกติ</span>
          {counts.trialing > 0 && <> · {counts.trialing} ทดลองใช้</>}
          {counts.past_due > 0 && (
            <> · <span className="text-destructive font-medium">{counts.past_due} ค้างชำระ</span></>
          )}
          {counts.suspended > 0 && (
            <> · <span className="text-destructive font-medium">{counts.suspended} ระงับ</span></>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">บริษัท</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">แพ็กเกจ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">รอบบิล</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สิ้นสุดรอบ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เหลือ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.map((sub) => {
              const isAlert = sub.status === 'past_due' || sub.status === 'suspended' || sub.overdue_months > 0
              return (
                <tr
                  key={sub.id}
                  className={cn('hover:bg-muted/20 transition-colors', isAlert && 'bg-destructive/[0.03]')}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/platform/companies/${sub.company_id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {sub.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="font-mono text-[11px]">{sub.plan_code}</span>
                    <span className="ml-1 text-[11px] text-muted-foreground/60">{sub.plan_name}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {sub.billing_cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {fmtDate(sub.current_period_end)}
                  </td>
                  <td className="px-4 py-3">
                    <DueBadge sub={sub} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[sub.status] ?? 'outline'} className="text-[11px]">
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </Badge>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  ยังไม่มี subscription
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

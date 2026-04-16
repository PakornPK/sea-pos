import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Building2, TrendingUp, AlertTriangle, Ban,
  CreditCard, ArrowRight, Receipt,
} from 'lucide-react'
import { requirePlatformAdmin } from '@/lib/auth'
import { billingRepo } from '@/lib/repositories'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Platform Dashboard | SEA-POS',
}

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' })
}

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'โอนธนาคาร',
  promptpay:     'PromptPay',
  cash:          'เงินสด',
  other:         'อื่น ๆ',
}

const SUB_STATUS_LABEL: Record<string, string> = {
  trialing:  'ทดลองใช้',
  active:    'ปกติ',
  past_due:  'ค้างชำระ',
  suspended: 'ระงับ',
  cancelled: 'ยกเลิก',
}

const SUB_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  trialing:  'outline',
  active:    'secondary',
  past_due:  'destructive',
  suspended: 'destructive',
  cancelled: 'outline',
}

export default async function PlatformDashboard() {
  await requirePlatformAdmin()
  const d = await billingRepo.getPlatformSummary()

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Platform Overview</h1>
        <p className="text-[14px] text-muted-foreground mt-1">ภาพรวมบริษัทลูกค้าและรายได้</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Building2}
          label="บริษัททั้งหมด"
          value={d.totalCompanies}
          sub={`ใช้งาน ${d.activeCompanies}`}
          href="/platform/companies"
        />
        <KpiCard
          icon={TrendingUp}
          label="MRR"
          value={`฿${fmt(d.mrrBaht)}`}
          sub={`รายรับเดือนนี้ ฿${fmt(d.revenueThisMonthBaht)}`}
          href="/platform/invoices"
          highlight
        />
        <KpiCard
          icon={AlertTriangle}
          label="ค้างชำระ"
          value={d.overdueCount}
          sub="subscription"
          href="/platform/companies"
          warn={d.overdueCount > 0}
        />
        <KpiCard
          icon={Ban}
          label="ระงับ / รออนุมัติ"
          value={d.suspendedCompanies + d.pendingCompanies}
          sub={`ระงับ ${d.suspendedCompanies} · รออนุมัติ ${d.pendingCompanies}`}
          href="/platform/companies"
          warn={(d.suspendedCompanies + d.pendingCompanies) > 0}
        />
      </div>

      {/* Subscription status breakdown */}
      {d.statusBreakdown.length > 0 && (
        <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="font-semibold text-[14px]">สัดส่วน Subscription</h2>
          </div>
          <div className="flex divide-x divide-border/40">
            {d.statusBreakdown
              .sort((a, b) => b.count - a.count)
              .map(({ status, count }) => (
                <div key={status} className="flex flex-1 flex-col items-center gap-1 px-4 py-4">
                  <span className="text-[22px] font-bold tabular-nums">{count}</span>
                  <Badge variant={SUB_STATUS_VARIANT[status] ?? 'outline'} className="text-[11px]">
                    {SUB_STATUS_LABEL[status] ?? status}
                  </Badge>
                </div>
              ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Needs attention */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[14px]">ต้องการดูแล</h2>
            <Link href="/platform/companies" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[12px] h-7')}>
              ดูทั้งหมด <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          {d.attentionCompanies.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/50 px-5 py-6 text-center text-[13px] text-muted-foreground">
              ไม่มีบริษัทที่ต้องดูแลเป็นพิเศษ
            </div>
          ) : (
            <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden divide-y divide-border/40">
              {d.attentionCompanies.map((c) => (
                <Link
                  key={c.id}
                  href={`/platform/companies/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-medium truncate">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.plan_code}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.overdue_months > 0 && (
                      <span className="text-[11px] text-destructive font-medium">
                        ค้าง {c.overdue_months} เดือน
                      </span>
                    )}
                    <Badge variant={SUB_STATUS_VARIANT[c.sub_status] ?? 'outline'} className="text-[11px]">
                      {SUB_STATUS_LABEL[c.sub_status] ?? c.sub_status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent payments */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[14px]">การชำระเงินล่าสุด</h2>
            <Link href="/platform/invoices" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[12px] h-7')}>
              ดูใบกำกับ <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          {d.recentPayments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/50 px-5 py-6 text-center text-[13px] text-muted-foreground">
              ยังไม่มีการชำระเงิน
            </div>
          ) : (
            <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden divide-y divide-border/40">
              {d.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-medium truncate">{p.company_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {METHOD_LABEL[p.method] ?? p.method} · {fmtDate(p.paid_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.receipt_path && (
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-label="มีสลิป" />
                    )}
                    <span className="text-[13px] font-semibold tabular-nums">
                      ฿{fmt(p.amount_baht)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon, label, value, sub, href, highlight, warn,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  href: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow',
        highlight && 'ring-primary/30',
        warn && 'ring-destructive/30',
      )}
    >
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl',
        highlight ? 'bg-primary/10' : warn ? 'bg-destructive/10' : 'bg-muted',
      )}>
        <Icon className={cn('h-4.5 w-4.5', highlight ? 'text-primary' : warn ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={cn(
          'text-[26px] font-bold tabular-nums tracking-tight leading-none',
          highlight && 'text-primary',
          warn && 'text-destructive',
        )}>
          {value}
        </span>
        <span className="text-[12px] font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </Link>
  )
}

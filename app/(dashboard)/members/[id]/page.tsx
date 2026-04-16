import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requirePage } from '@/lib/auth'
import { loyaltyRepo } from '@/lib/repositories'
import { AdjustPointsForm } from '@/components/loyalty/AdjustPointsForm'

export const metadata: Metadata = { title: 'ข้อมูลสมาชิก | SEA-POS' }

const LOG_TYPE_LABEL: Record<string, string> = {
  earn:       'ได้รับแต้ม',
  redeem:     'แลกแต้ม',
  expire:     'หมดอายุ',
  commission: 'Commission',
  adjust:     'ปรับแต้ม',
}

const LOG_TYPE_COLOR: Record<string, string> = {
  earn:       'text-green-600',
  redeem:     'text-amber-600',
  expire:     'text-muted-foreground',
  commission: 'text-blue-600',
  adjust:     'text-muted-foreground',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' })
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage()
  const { id } = await params
  const [member, log] = await Promise.all([
    loyaltyRepo.getMember(id),
    loyaltyRepo.getPointsLog(id),
  ])
  if (!member) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Link
        href="/members"
        className="flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        รายชื่อสมาชิก
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-muted-foreground">{member.member_no}</span>
            {member.tier && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium text-white"
                style={{ backgroundColor: member.tier.color }}
              >
                {member.tier.name}
              </span>
            )}
          </div>
          <h1 className="text-[24px] font-bold tracking-tight mt-0.5">{member.name}</h1>
          <p className="text-[13px] text-muted-foreground">
            {member.phone ?? '—'} · {member.email ?? '—'}
          </p>
        </div>
        <div className="rounded-2xl bg-card ring-1 ring-border/60 px-6 py-4 text-center shadow-sm">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">แต้มคงเหลือ</p>
          <p className="text-[32px] font-bold tabular-nums text-primary leading-none mt-1">
            {member.points_balance.toLocaleString('th-TH')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ยอดซื้อรวม ฿{member.total_spend_baht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Points log */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="font-semibold text-[14px]">ประวัติแต้ม</h2>
          <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
            {log.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">ยังไม่มีประวัติ</p>
            ) : (
              <table className="w-full text-[12px]">
                <tbody className="divide-y divide-border/40">
                  {log.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(entry.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className={LOG_TYPE_COLOR[entry.type] ?? ''}>
                          {LOG_TYPE_LABEL[entry.type] ?? entry.type}
                        </span>
                        {entry.note && (
                          <span className="block text-[11px] text-muted-foreground">{entry.note}</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${entry.points >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {entry.points >= 0 ? '+' : ''}{entry.points.toLocaleString('th-TH')}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {entry.balance_after.toLocaleString('th-TH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Adjust points */}
          <AdjustPointsForm memberId={member.id} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-[14px]">ข้อมูลสมาชิก</h2>
          <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4">
            <div className="grid grid-cols-2 gap-y-2 text-[13px]">
              <span className="text-muted-foreground">วันสมัคร</span>
              <span>{fmtDate(member.enrolled_at)}</span>
              <span className="text-muted-foreground">ที่อยู่</span>
              <span>{member.address ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

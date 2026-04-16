import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePage } from '@/lib/auth'
import { loyaltyRepo } from '@/lib/repositories'
import { Badge } from '@/components/ui/badge'
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
  const [member, log, upline, downline] = await Promise.all([
    loyaltyRepo.getMember(id),
    loyaltyRepo.getPointsLog(id),
    loyaltyRepo.getUpline(id),
    loyaltyRepo.getDownline(id, 3),
  ])
  if (!member) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Points log */}
        <div className="flex flex-col gap-3">
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

        <div className="flex flex-col gap-6">
          {/* Upline */}
          {upline.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-[14px]">สายงานขึ้น</h2>
              <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 divide-y divide-border/40 overflow-hidden">
                {upline.map((u) => (
                  <div key={u.member_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[11px] text-muted-foreground w-14">ระดับ {u.depth}</span>
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="font-medium truncate text-[13px]">{u.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{u.member_no}</span>
                    </div>
                    {u.tier_name && u.tier_color && (
                      <span
                        className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: u.tier_color }}
                      >
                        {u.tier_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Downline */}
          {downline.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-[14px]">สายงานลง <span className="text-[12px] font-normal text-muted-foreground">(3 ระดับ)</span></h2>
              <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 divide-y divide-border/40 overflow-hidden">
                {downline.map((d) => (
                  <div key={d.member_id} className="flex items-center gap-3 px-4 py-2.5" style={{ paddingLeft: `${(d.depth) * 12 + 16}px` }}>
                    <span className="text-[11px] text-muted-foreground w-14">ระดับ {d.depth}</span>
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="font-medium truncate text-[13px]">{d.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{d.member_no}</span>
                    </div>
                    {d.tier_name && d.tier_color && (
                      <span
                        className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: d.tier_color }}
                      >
                        {d.tier_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-[14px]">ข้อมูลสมาชิก</h2>
            <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-4">
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <span className="text-muted-foreground">วันสมัคร</span>
                <span>{fmtDate(member.enrolled_at)}</span>
                {member.referred_by_no && (
                  <>
                    <span className="text-muted-foreground">ผู้แนะนำ</span>
                    <span className="font-mono text-[12px]">{member.referred_by_no}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

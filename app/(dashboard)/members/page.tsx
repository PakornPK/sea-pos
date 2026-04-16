import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { requirePage } from '@/lib/auth'
import { loyaltyRepo } from '@/lib/repositories'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'สมาชิก | SEA-POS' }

function TierBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  )
}

export default async function MembersPage() {
  await requirePage()
  const members = await loyaltyRepo.listMembers()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">สมาชิก</h1>
          <p className="text-[14px] text-muted-foreground mt-1">{members.length} คน</p>
        </div>
        <Link
          href="/members/enroll"
          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
        >
          <UserPlus className="h-3.5 w-3.5" />
          สมัครสมาชิก
        </Link>
      </div>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลขสมาชิก</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">โทรศัพท์</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ระดับ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">แต้ม</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">ยอดซื้อรวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-[12px]">
                  <Link href={`/members/${m.id}`} className="text-primary hover:underline">
                    {m.member_no}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  {m.tier_name && m.tier_color
                    ? <TierBadge name={m.tier_name} color={m.tier_color} />
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {m.points_balance.toLocaleString('th-TH')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  ฿{m.total_spend_baht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  ยังไม่มีสมาชิก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loyaltyRepo } from '@/lib/repositories'
import { parseSort, sortRows, sortToggleHref } from '@/lib/sort'
import { SortableHeader } from '@/components/ui/SortableHeader'
import type { MemberListRow } from '@/lib/repositories'

type SortCol = 'member_no' | 'name' | 'phone' | 'tier_name' | 'points_balance' | 'total_spend_baht'

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

export function MembersSection() {
  const searchParams = useSearchParams()
  const sp = {
    sort: searchParams.get('sort') ?? undefined,
    dir:  searchParams.get('dir')  ?? undefined,
  }
  const { col, dir } = parseSort<SortCol>(sp, 'member_no', 'asc')

  const [allMembers, setAllMembers] = useState<MemberListRow[]>([])

  useEffect(() => {
    loyaltyRepo.listMembers().then(setAllMembers).catch(() => {})
  }, [])

  const members = sortRows(allMembers, col as keyof MemberListRow, dir)

  function href(c: SortCol) {
    return sortToggleHref('/members', sp as Record<string, string | undefined>, c, col, dir)
  }

  return (
    <>
      <p className="text-[14px] text-muted-foreground -mt-4">{members.length} คน</p>

      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader label="เลขสมาชิก" active={col === 'member_no'} dir={dir} href={href('member_no')} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader label="ชื่อ" active={col === 'name'} dir={dir} href={href('name')} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader label="โทรศัพท์" active={col === 'phone'} dir={dir} href={href('phone')} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader label="ระดับ" active={col === 'tier_name'} dir={dir} href={href('tier_name')} />
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <SortableHeader label="แต้ม" active={col === 'points_balance'} dir={dir} href={href('points_balance')} />
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <SortableHeader label="ยอดซื้อรวม" active={col === 'total_spend_baht'} dir={dir} href={href('total_spend_baht')} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-[12px]">
                  <Link href={`/members/detail/?id=${m.id}`} className="text-primary hover:underline">
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
    </>
  )
}

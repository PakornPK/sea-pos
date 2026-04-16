'use client'

import { useState, useRef } from 'react'
import { Search, X, Star, Loader2 } from 'lucide-react'
import { lookupMemberByPhone, type MemberLookupResult } from '@/lib/actions/loyalty'
import { chain, money } from '@/lib/money'
import { formatBaht } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  member: MemberLookupResult | null
  redeemPoints: number
  billTotal: number                        // current cart total (for cap calculation)
  onChange: (member: MemberLookupResult | null, redeemPoints: number) => void
}

export function MemberLookupPanel({ member, redeemPoints, billTotal, onChange }: Props) {
  const [phone, setPhone]     = useState('')
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function lookup() {
    const q = phone.trim()
    if (!q) return
    setSearching(true)
    setNotFound(false)
    const result = await lookupMemberByPhone(q)
    setSearching(false)
    if (result) {
      onChange(result, 0)
      setNotFound(false)
    } else {
      onChange(null, 0)
      setNotFound(true)
    }
  }

  function clear() {
    onChange(null, 0)
    setPhone('')
    setNotFound(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Max redeemable points = floor(billTotal × max_redeem_pct% / baht_per_point)
  const maxDiscountBaht = member
    ? money(chain(billTotal).times(member.max_redeem_pct).div(100))
    : 0
  const maxRedeemable = member && member.baht_per_point > 0
    ? Math.min(
        member.points_balance,
        Math.floor(chain(maxDiscountBaht).div(member.baht_per_point).toNumber()),
      )
    : 0

  const discountBaht = member && redeemPoints > 0
    ? Math.min(
        money(chain(redeemPoints).times(member.baht_per_point)),
        maxDiscountBaht,
      )
    : 0

  function onRedeemChange(raw: string) {
    if (!member) return
    const v = Math.max(0, Math.min(maxRedeemable, Number(raw) || 0))
    onChange(member, v)
  }

  return (
    <div className="space-y-2">
      {/* Label row */}
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">สมาชิก</p>

      {member ? (
        /* Member card */
        <div className="rounded-xl bg-muted/50 px-3 py-2.5 space-y-2">
          {/* Identity row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-semibold leading-snug truncate">{member.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{member.member_no}</span>
                {member.tier_name && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                    style={{ backgroundColor: member.tier_color ?? '#6366f1' }}
                  >
                    <Star className="h-2 w-2" />
                    {member.tier_name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                {member.points_balance.toLocaleString()} แต้ม
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors mt-0.5"
              aria-label="ล้างสมาชิก"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Redeem row — only show when there are points and billTotal > 0 */}
          {maxRedeemable > 0 && (
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-[11px] text-muted-foreground">ใช้แต้ม</label>
              <input
                type="number"
                min={0}
                max={maxRedeemable}
                value={redeemPoints || ''}
                onChange={(e) => onRedeemChange(e.target.value)}
                placeholder="0"
                className={cn(
                  'w-20 rounded-lg border bg-background px-2 py-1 text-[12px] tabular-nums outline-none',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                )}
              />
              <span className="text-[11px] text-muted-foreground shrink-0">
                / {maxRedeemable.toLocaleString()}
              </span>
              {discountBaht > 0 && (
                <span className="ml-auto text-[12px] font-semibold text-[oklch(0.5_0.18_145)] tabular-nums shrink-0">
                  -{formatBaht(discountBaht)}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Phone search */
        <div className="space-y-1">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="tel"
                placeholder="เบอร์โทร"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setNotFound(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup() } }}
                className={cn(
                  'w-full rounded-xl border bg-background px-3 py-1.5 text-[13px] outline-none transition-all',
                  'focus:border-primary focus:ring-2 focus:ring-primary/20',
                  notFound && 'border-destructive',
                )}
              />
            </div>
            <button
              type="button"
              onClick={lookup}
              disabled={!phone.trim() || searching}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity"
            >
              {searching
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Search className="h-3.5 w-3.5" />
              }
            </button>
          </div>
          {notFound && (
            <p className="text-[11px] text-destructive">ไม่พบสมาชิก</p>
          )}
        </div>
      )}
    </div>
  )
}

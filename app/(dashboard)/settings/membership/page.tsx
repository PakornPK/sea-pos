'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-client'
import { loyaltyRepo } from '@/lib/repositories'
import { MembershipSettingsForm } from '@/components/loyalty/MembershipSettingsForm'
import { TierList } from '@/components/loyalty/TierList'

type LoyaltySettings = Awaited<ReturnType<typeof loyaltyRepo.getSettings>>
type Tier = Awaited<ReturnType<typeof loyaltyRepo.listTiers>>[number]

export default function MembershipSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loyaltyRepo.getSettings(),
      loyaltyRepo.listTiers(),
    ])
      .then(([s, t]) => { setSettings(s); setTiers(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user || loading) return null

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">ตั้งค่าระบบสมาชิก</h1>
        <p className="text-[14px] text-muted-foreground mt-1">กำหนดอัตราแต้ม, ระดับสมาชิก และ MLM</p>
      </div>

      <MembershipSettingsForm settings={settings} />
      <TierList tiers={tiers} />
    </div>
  )
}

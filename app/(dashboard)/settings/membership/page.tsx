import type { Metadata } from 'next'
import { requirePage } from '@/lib/auth'
import { loyaltyRepo } from '@/lib/repositories'
import { MembershipSettingsForm } from '@/components/loyalty/MembershipSettingsForm'
import { TierList } from '@/components/loyalty/TierList'

export const metadata: Metadata = { title: 'ตั้งค่าสมาชิก | SEA-POS' }

export default async function MembershipSettingsPage() {
  await requirePage()
  const [settings, tiers] = await Promise.all([
    loyaltyRepo.getSettings(),
    loyaltyRepo.listTiers(),
  ])

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

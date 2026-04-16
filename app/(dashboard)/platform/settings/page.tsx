import type { Metadata } from 'next'
import { requirePlatformAdmin } from '@/lib/auth'
import { billingRepo } from '@/lib/repositories'
import { PlatformSettingsForm } from '@/components/platform/PlatformSettingsForm'

export const metadata: Metadata = {
  title: 'ตั้งค่าแพลตฟอร์ม | SEA-POS',
}

export default async function PlatformSettingsPage() {
  await requirePlatformAdmin()
  const settings = await billingRepo.getSettings()

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">ตั้งค่าแพลตฟอร์ม</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          ข้อมูลผู้ขาย VAT และการชำระเงินสำหรับใบกำกับภาษีทุกฉบับ
        </p>
      </div>
      <PlatformSettingsForm settings={settings} />
    </div>
  )
}

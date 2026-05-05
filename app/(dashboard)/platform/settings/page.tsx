'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-client'
import { billingRepo } from '@/lib/repositories'
import { PlatformSettingsForm } from '@/components/platform/PlatformSettingsForm'

type PlatformSettings = Awaited<ReturnType<typeof billingRepo.getSettings>>

export default function PlatformSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    billingRepo.getSettings()
      .then((d) => { setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user || loading || !settings) return null

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

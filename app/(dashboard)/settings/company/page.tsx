import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePageRole } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm'

export const metadata: Metadata = {
  title: 'ตั้งค่าบริษัท | SEA-POS',
}

export default async function CompanySettingsPage() {
  await requirePageRole(['admin'])
  const company = await companyRepo.getCurrent()
  if (!company) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">ตั้งค่าบริษัท</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ข้อมูลที่แสดงบนใบเสร็จและเอกสารของบริษัท
        </p>
      </div>
      <CompanySettingsForm company={company} />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { useAuth } from '@/lib/auth-client'
import { companyRepo } from '@/lib/repositories'
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm'
import type { Company } from '@/types/database'

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)

  useEffect(() => {
    companyRepo.getCurrent()
      .then((d) => setCompany(d ?? null))
      .catch(() => setCompany(null))
  }, [])

  if (!user || company === undefined) return null
  if (company === null) notFound()

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

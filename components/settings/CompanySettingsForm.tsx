'use client'

import { useActionState, useEffect, useState } from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import { updateCompanySettings } from '@/lib/actions/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Company } from '@/types/database'

type Props = {
  company: Company
}

export function CompanySettingsForm({ company }: Props) {
  const [state, formAction, pending] = useActionState(updateCompanySettings, undefined)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (state?.success) {
      setShowSaved(true)
      const t = setTimeout(() => setShowSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state])

  const settings = (company.settings ?? {}) as {
    receipt_header?: string
    receipt_footer?: string
    tax_id?: string
    phone?: string
    address?: string
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-xl">
      {/* Company identity */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">ข้อมูลบริษัท</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อบริษัท *</Label>
          <Input
            id="name"
            name="name"
            required
            disabled={pending}
            defaultValue={company.name}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">เบอร์โทร</Label>
            <Input
              id="phone"
              name="phone"
              disabled={pending}
              defaultValue={settings.phone ?? ''}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="tax_id"
              name="tax_id"
              disabled={pending}
              defaultValue={settings.tax_id ?? ''}
              placeholder="13 หลัก"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">ที่อยู่</Label>
          <Input
            id="address"
            name="address"
            disabled={pending}
            defaultValue={settings.address ?? ''}
          />
        </div>
      </section>

      {/* Receipt customization */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">ใบเสร็จรับเงิน</h2>
          <p className="text-xs text-muted-foreground mt-1">
            ข้อความที่จะปรากฏด้านบน / ด้านล่าง ของใบเสร็จทุกรายการ
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receipt_header">ข้อความหัวใบเสร็จ</Label>
          <Input
            id="receipt_header"
            name="receipt_header"
            disabled={pending}
            defaultValue={settings.receipt_header ?? ''}
            placeholder="เช่น ยินดีต้อนรับ"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receipt_footer">ข้อความท้ายใบเสร็จ</Label>
          <Input
            id="receipt_footer"
            name="receipt_footer"
            disabled={pending}
            defaultValue={settings.receipt_footer ?? ''}
            placeholder="เช่น ขอบคุณที่ใช้บริการ"
          />
        </div>
      </section>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {showSaved && (
        <p className="text-sm text-green-600 inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          บันทึกการเปลี่ยนแปลงแล้ว
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </form>
  )
}

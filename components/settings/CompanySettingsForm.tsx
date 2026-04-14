'use client'

import { useActionState, useEffect, useState } from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import { updateCompanySettings } from '@/lib/actions/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CompanyLogoUpload } from '@/components/settings/CompanyLogoUpload'
import type { Company } from '@/types/database'

type Props = {
  company: Company
}

export function CompanySettingsForm({ company }: Props) {
  const [state, formAction, pending] = useActionState(updateCompanySettings, undefined)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    // Show "saved" toast for 3s after each successful submit.
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    logo_url?: string
    letterhead_url?: string
    vat_mode?: 'none' | 'included' | 'excluded'
    vat_rate?: number
  }
  const currentVatMode = settings.vat_mode ?? 'none'
  const currentVatRate = typeof settings.vat_rate === 'number' ? settings.vat_rate : 7
  const [vatMode, setVatMode] = useState<'none' | 'included' | 'excluded'>(currentVatMode)

  return (
   <div className="flex flex-col gap-6 max-w-xl">
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-sm">โลโก้และหัวจดหมาย</h2>
        <p className="text-xs text-muted-foreground mt-1">
          ใช้แสดงบนใบเสร็จ ใบสั่งซื้อ และเอกสารต่างๆ
        </p>
      </div>
      <CompanyLogoUpload
        kind="logo"
        label="โลโก้บริษัท"
        hint="แนะนำสี่เหลี่ยมจัตุรัส, PNG/SVG, ไม่เกิน 2MB"
        currentUrl={settings.logo_url ?? null}
        aspect="square"
      />
      <CompanyLogoUpload
        kind="letterhead"
        label="หัวจดหมาย"
        hint="แนะนำแนวนอน, PNG/JPG, ไม่เกิน 2MB"
        currentUrl={settings.letterhead_url ?? null}
        aspect="wide"
      />
    </section>

    <form action={formAction} className="flex flex-col gap-6">
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

      {/* VAT configuration */}
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">ภาษีมูลค่าเพิ่ม (VAT)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            ตั้งค่าการคิด VAT ระดับบริษัท ยกเว้นรายสินค้า/หมวดหมู่ได้ในหน้าสินค้า
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vat_mode">รูปแบบ VAT</Label>
            <select
              id="vat_mode"
              name="vat_mode"
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as 'none' | 'included' | 'excluded')}
              disabled={pending}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="none">ไม่คิด VAT</option>
              <option value="excluded">ราคาไม่รวม VAT (บวกเพิ่มตอนชำระ)</option>
              <option value="included">ราคารวม VAT แล้ว (แยกรายงานภายหลัง)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vat_rate">อัตรา VAT (%)</Label>
            <Input
              id="vat_rate"
              name="vat_rate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={currentVatRate}
              disabled={pending || vatMode === 'none'}
              placeholder="7"
            />
          </div>
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
   </div>
  )
}

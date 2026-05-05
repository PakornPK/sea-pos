'use client'

import { useActionState, useEffect, useState } from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import { updateCompanySettings } from '@/lib/actions/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { CompanyLogoUpload } from '@/components/settings/CompanyLogoUpload'
import type { Company } from '@/types/database'

type Props = {
  company: Company
}

type Settings = {
  receipt_header?: string
  receipt_footer?: string
  tax_id?: string
  phone?: string
  address?: string
  logo_url?: string
  letterhead_url?: string
  vat_mode?: 'none' | 'included' | 'excluded'
  vat_rate?: number
  allow_negative_stock?: boolean
}

function parseSettings(company: Company): Settings {
  return (company.settings ?? {}) as Settings
}

export function CompanySettingsForm({ company }: Props) {
  const [state, formAction, pending] = useActionState(updateCompanySettings, undefined)
  const [showSaved, setShowSaved] = useState(false)

  const s = parseSettings(company)

  const [name, setName]                       = useState(company.name ?? '')
  const [phone, setPhone]                     = useState(s.phone ?? '')
  const [taxId, setTaxId]                     = useState(s.tax_id ?? '')
  const [address, setAddress]                 = useState(s.address ?? '')
  const [vatMode, setVatMode]                 = useState<'none' | 'included' | 'excluded'>(s.vat_mode ?? 'none')
  const [vatRate, setVatRate]                 = useState(String(typeof s.vat_rate === 'number' ? s.vat_rate : 7))
  const [allowNegStock, setAllowNegStock]     = useState(s.allow_negative_stock !== false)
  const [receiptHeader, setReceiptHeader]     = useState(s.receipt_header ?? '')
  const [receiptFooter, setReceiptFooter]     = useState(s.receipt_footer ?? '')

  useEffect(() => {
    if (state?.success) {
      setShowSaved(true)
      const t = setTimeout(() => setShowSaved(false), 3000)
      return () => clearTimeout(t)
    }
  }, [state])

  return (
   <div className="flex flex-col gap-6 max-w-xl">
    <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
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
        currentUrl={s.logo_url ?? null}
        aspect="square"
      />
      <CompanyLogoUpload
        kind="letterhead"
        label="หัวจดหมาย"
        hint="แนะนำแนวนอน, PNG/JPG, ไม่เกิน 2MB"
        currentUrl={s.letterhead_url ?? null}
        aspect="wide"
      />
    </section>

    <form action={formAction} className="flex flex-col gap-6">
      {/* Company identity */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">เบอร์โทร</Label>
            <Input
              id="phone"
              name="phone"
              disabled={pending}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="tax_id"
              name="tax_id"
              disabled={pending}
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
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
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </section>

      {/* VAT configuration */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">ภาษีมูลค่าเพิ่ม (VAT)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            ตั้งค่าการคิด VAT ระดับบริษัท ยกเว้นรายสินค้า/หมวดหมู่ได้ในหน้าสินค้า
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vat_mode">รูปแบบ VAT</Label>
            <NativeSelect
              id="vat_mode"
              name="vat_mode"
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as 'none' | 'included' | 'excluded')}
              disabled={pending}
            >
              <option value="none">ไม่คิด VAT</option>
              <option value="excluded">ราคาไม่รวม VAT (บวกเพิ่มตอนชำระ)</option>
              <option value="included">ราคารวม VAT แล้ว (แยกรายงานภายหลัง)</option>
            </NativeSelect>
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
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              disabled={pending || vatMode === 'none'}
              placeholder="7"
            />
          </div>
        </div>
      </section>

      {/* Stock behaviour */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm">สต๊อก</h2>
          <p className="text-xs text-muted-foreground mt-1">
            ควบคุมการขายเมื่อสต๊อกหมด
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="allow_negative_stock"
            value="true"
            checked={allowNegStock}
            onChange={(e) => setAllowNegStock(e.target.checked)}
            disabled={pending}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <input type="hidden" name="allow_negative_stock" value="false" />
          <span className="text-sm leading-snug">
            อนุญาตให้สต๊อกติดลบ
            <span className="block text-xs text-muted-foreground mt-0.5">
              เปิด (ค่าเริ่มต้น) — ขายได้แม้สต๊อกเป็น 0 แล้วแก้ทีหลัง
              <br />
              ปิด — บล็อกการขายทันทีถ้าสต๊อกไม่พอ
            </span>
          </span>
        </label>
      </section>

      {/* Receipt customization */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 p-5 space-y-4">
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
            value={receiptHeader}
            onChange={(e) => setReceiptHeader(e.target.value)}
            placeholder="เช่น ยินดีต้อนรับ"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receipt_footer">ข้อความท้ายใบเสร็จ</Label>
          <Input
            id="receipt_footer"
            name="receipt_footer"
            disabled={pending}
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
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

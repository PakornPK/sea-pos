'use client'

import { useActionState } from 'react'
import { Check } from 'lucide-react'
import { updatePlatformSettings } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PlatformSettings } from '@/types/database'

export function PlatformSettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, formAction, pending] = useActionState(updatePlatformSettings, undefined)

  return (
    <form action={formAction} className="space-y-8">
      {/* Seller identity */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-[15px]">ข้อมูลผู้ขาย (ผู้ออกใบกำกับภาษี)</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">ปรากฏบนใบกำกับภาษีทุกฉบับ</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller_name">ชื่อบริษัท / ผู้ขาย *</Label>
              <Input id="seller_name" name="seller_name" required defaultValue={settings.seller_name} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller_tax_id">เลขประจำตัวผู้เสียภาษี</Label>
              <Input id="seller_tax_id" name="seller_tax_id" defaultValue={settings.seller_tax_id ?? ''} disabled={pending} placeholder="13 หลัก" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seller_address">ที่อยู่</Label>
            <Input id="seller_address" name="seller_address" defaultValue={settings.seller_address ?? ''} disabled={pending} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller_phone">โทรศัพท์</Label>
              <Input id="seller_phone" name="seller_phone" defaultValue={settings.seller_phone ?? ''} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seller_email">อีเมล</Label>
              <Input id="seller_email" name="seller_email" type="email" defaultValue={settings.seller_email ?? ''} disabled={pending} />
            </div>
          </div>
        </div>
      </section>

      {/* VAT */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-[15px]">ภาษีมูลค่าเพิ่ม (VAT)</h2>
        </div>
        <div className="p-5 space-y-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="vat_enabled"
              defaultChecked={settings.vat_enabled}
              disabled={pending}
              className="h-4 w-4 rounded border-input"
            />
            เปิดใช้ VAT ในใบกำกับภาษีแพลตฟอร์ม
          </label>
          <div className="flex items-center gap-2">
            <Label htmlFor="vat_rate_pct" className="shrink-0">อัตรา VAT (%)</Label>
            <Input
              id="vat_rate_pct"
              name="vat_rate_pct"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={settings.vat_rate_pct}
              disabled={pending}
              className="w-28"
            />
          </div>
        </div>
      </section>

      {/* Banking */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-[15px]">ข้อมูลการชำระเงิน</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">แสดงบนใบกำกับภาษีเพื่อให้ลูกค้าโอนเงิน</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_name">ธนาคาร</Label>
              <Input id="bank_name" name="bank_name" defaultValue={settings.bank_name ?? ''} disabled={pending} placeholder="เช่น กสิกรไทย" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_account_name">ชื่อบัญชี</Label>
              <Input id="bank_account_name" name="bank_account_name" defaultValue={settings.bank_account_name ?? ''} disabled={pending} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bank_account_no">เลขบัญชี</Label>
              <Input id="bank_account_no" name="bank_account_no" defaultValue={settings.bank_account_no ?? ''} disabled={pending} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promptpay_id">PromptPay (เบอร์โทร / เลขภาษี)</Label>
            <Input id="promptpay_id" name="promptpay_id" defaultValue={settings.promptpay_id ?? ''} disabled={pending} className="max-w-xs" />
          </div>
        </div>
      </section>

      {/* Invoice numbering */}
      <section className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-[15px]">รูปแบบเลขที่ใบกำกับภาษี</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            ตัวอย่าง: {settings.invoice_prefix}-{new Date().getFullYear()}-0001
          </p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice_prefix" className="shrink-0">Prefix</Label>
            <Input
              id="invoice_prefix"
              name="invoice_prefix"
              defaultValue={settings.invoice_prefix}
              disabled={pending}
              className="w-28 font-mono"
              placeholder="INV"
            />
          </div>
        </div>
      </section>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">บันทึกเรียบร้อยแล้ว</p>}

      <Button type="submit" disabled={pending}>
        <Check className="h-4 w-4" />
        {pending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
      </Button>
    </form>
  )
}

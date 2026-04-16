'use client'

import { useActionState, useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Check, Receipt } from 'lucide-react'
import { updateCompanyBillingInfo, getReceiptUrl } from '@/lib/actions/billing'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { InvoiceList } from './InvoiceList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Company, Subscription, SubscriptionPayment, PaymentMethod } from '@/types/database'
import type { InvoiceListRow } from '@/lib/repositories'

const STATUS_LABEL: Record<Subscription['status'], string> = {
  trialing:  'ทดลองใช้',
  active:    'ใช้งานอยู่',
  past_due:  'ค้างชำระ',
  suspended: 'ระงับ',
  cancelled: 'ยกเลิก',
}

const STATUS_VARIANT: Record<Subscription['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  trialing:  'outline',
  active:    'secondary',
  past_due:  'destructive',
  suspended: 'destructive',
  cancelled: 'outline',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'medium' })
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'โอนธนาคาร',
  promptpay:     'PromptPay',
  cash:          'เงินสด',
  other:         'อื่น ๆ',
}

function ReceiptViewButton({ receiptPath }: { receiptPath: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      className="h-7 px-2 text-primary"
      onClick={() =>
        startTransition(async () => {
          const url = await getReceiptUrl(receiptPath)
          if (url) window.open(url, '_blank', 'noopener,noreferrer')
        })
      }
    >
      <Receipt className="h-3.5 w-3.5" />
      <span className="text-[12px]">{pending ? '...' : 'ดูสลิป'}</span>
    </Button>
  )
}

function PaymentHistory({ payments }: { payments: SubscriptionPayment[] }) {
  if (payments.length === 0) {
    return <p className="text-[13px] text-muted-foreground">ยังไม่มีประวัติการชำระเงิน</p>
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border/50">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">วันที่</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">วิธี</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ref</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">จำนวน</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-muted/20">
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {new Date(p.paid_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              </td>
              <td className="px-3 py-2">{METHOD_LABEL[p.method]}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {p.reference_no ?? '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                ฿{p.amount_baht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-3 py-2 text-right">
                {p.receipt_path && <ReceiptViewButton receiptPath={p.receipt_path} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BillingInfoForm({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(updateCompanyBillingInfo, undefined)

  if (state?.success && open) setOpen(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        แก้ไขข้อมูลบิล
      </button>

      {open && (
        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="company_id" value={company.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-tax">เลขประจำตัวผู้เสียภาษี</Label>
              <Input id="bi-tax" name="tax_id" defaultValue={company.tax_id ?? ''} disabled={pending} placeholder="13 หลัก" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-phone">โทรศัพท์</Label>
              <Input id="bi-phone" name="contact_phone" defaultValue={company.contact_phone ?? ''} disabled={pending} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bi-email">อีเมลสำหรับรับใบกำกับภาษี</Label>
            <Input id="bi-email" name="contact_email" type="email" defaultValue={company.contact_email ?? ''} disabled={pending} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bi-addr">ที่อยู่</Label>
            <Input id="bi-addr" name="address" defaultValue={company.address ?? ''} disabled={pending} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-3.5 w-3.5" />
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </form>
      )}
    </div>
  )
}

export function CompanyBillingSection({
  company,
  subscription,
  invoices,
  payments,
}: {
  company: Company
  subscription: Subscription | null
  invoices: InvoiceListRow[]
  payments: SubscriptionPayment[]
}) {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h2 className="font-semibold text-[15px]">การเรียกเก็บเงิน</h2>

      {/* Subscription card */}
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-[14px]">สถานะ Subscription</h3>
          {subscription && (
            <Badge variant={STATUS_VARIANT[subscription.status]}>
              {STATUS_LABEL[subscription.status]}
            </Badge>
          )}
        </div>
        <div className="p-5 space-y-3">
          {subscription ? (
            <>
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <span className="text-muted-foreground">แพ็กเกจ</span>
                <span className="font-medium">{subscription.plan_code}</span>
                <span className="text-muted-foreground">รอบบิลปัจจุบัน</span>
                <span>{fmtDate(subscription.current_period_start)} – {fmtDate(subscription.current_period_end)}</span>
                <span className="text-muted-foreground">เดือนค้างชำระ</span>
                <span className={cn('font-medium', subscription.overdue_months > 0 && 'text-destructive')}>
                  {subscription.overdue_months} เดือน
                </span>
                {subscription.notes && (
                  <>
                    <span className="text-muted-foreground">หมายเหตุ</span>
                    <span className="text-[12px]">{subscription.notes}</span>
                  </>
                )}
              </div>
              <div className="pt-2">
                <RecordPaymentDialog
                  subscription={subscription}
                  companyId={company.id}
                  companyName={company.name}
                />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">ยังไม่มี subscription — จะถูกสร้างอัตโนมัติเมื่อบันทึกการชำระเงินครั้งแรก</p>
          )}
        </div>
      </div>

      {/* Billing contact */}
      <div className="rounded-2xl bg-card shadow-sm ring-1 ring-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-semibold text-[14px]">ข้อมูลสำหรับออกใบกำกับภาษี</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-y-2 text-[13px]">
            <span className="text-muted-foreground">เลขภาษี</span>
            <span className="font-mono text-[12px]">{company.tax_id ?? '—'}</span>
            <span className="text-muted-foreground">อีเมล</span>
            <span>{company.contact_email ?? '—'}</span>
            <span className="text-muted-foreground">โทรศัพท์</span>
            <span>{company.contact_phone ?? '—'}</span>
            <span className="text-muted-foreground">ที่อยู่</span>
            <span className="text-[12px]">{company.address ?? '—'}</span>
          </div>
          <BillingInfoForm company={company} />
        </div>
      </div>

      {/* Payment history */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-[14px]">ประวัติการชำระเงิน</h3>
        <PaymentHistory payments={payments} />
      </div>

      {/* Invoice list */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-[14px]">ใบกำกับภาษี</h3>
        <InvoiceList invoices={invoices} showCompany={false} />
      </div>
    </div>
  )
}

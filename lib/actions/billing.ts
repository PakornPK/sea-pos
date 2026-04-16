'use server'

import { revalidatePath } from 'next/cache'
import { getActionUser } from '@/lib/auth'
import { billingRepo, storageRepo } from '@/lib/repositories'
import type { PaymentMethod } from '@/types/database'
import type { InvoiceLine } from '@/types/database'

export type BillingState = { error?: string; success?: boolean; id?: string; invoice_no?: string } | undefined

async function requirePlatformAdmin() {
  const { me } = await getActionUser()
  if (!me.isPlatformAdmin) throw new Error('เฉพาะผู้ดูแลแพลตฟอร์มเท่านั้น')
  return { me }
}

// ─── Platform settings ────────────────────────────────────────────────────────

export async function updatePlatformSettings(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  try {
    await requirePlatformAdmin()
    const err = await billingRepo.updateSettings({
      seller_name:        String(formData.get('seller_name')      ?? '').trim() || undefined,
      seller_tax_id:      String(formData.get('seller_tax_id')    ?? '').trim() || null,
      seller_address:     String(formData.get('seller_address')   ?? '').trim() || null,
      seller_phone:       String(formData.get('seller_phone')     ?? '').trim() || null,
      seller_email:       String(formData.get('seller_email')     ?? '').trim() || null,
      vat_enabled:        formData.get('vat_enabled') === 'on',
      vat_rate_pct:       Number(formData.get('vat_rate_pct')     ?? 7) || 7,
      bank_name:          String(formData.get('bank_name')        ?? '').trim() || null,
      bank_account_name:  String(formData.get('bank_account_name')?? '').trim() || null,
      bank_account_no:    String(formData.get('bank_account_no')  ?? '').trim() || null,
      promptpay_id:       String(formData.get('promptpay_id')     ?? '').trim() || null,
      invoice_prefix:     String(formData.get('invoice_prefix')   ?? '').trim() || undefined,
    })
    if (err) return { error: err }
    revalidatePath('/platform/settings')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Company billing info ─────────────────────────────────────────────────────

export async function updateCompanyBillingInfo(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  try {
    await requirePlatformAdmin()
    // Dynamically import to avoid circular dep; company repo is in repositories
    const { companyRepo } = await import('@/lib/repositories')
    const companyId = String(formData.get('company_id') ?? '').trim()
    if (!companyId) return { error: 'ไม่พบบริษัท' }
    const err = await companyRepo.updateBillingInfo(companyId, {
      tax_id:        String(formData.get('tax_id')        ?? '').trim() || null,
      address:       String(formData.get('address')       ?? '').trim() || null,
      contact_email: String(formData.get('contact_email') ?? '').trim() || null,
      contact_phone: String(formData.get('contact_phone') ?? '').trim() || null,
    })
    if (err) return { error: err }
    revalidatePath(`/platform/companies/${companyId}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Record payment ───────────────────────────────────────────────────────────

export async function recordPayment(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  try {
    const { me } = await requirePlatformAdmin()
    const subscriptionId = String(formData.get('subscription_id') ?? '').trim()
    const companyId      = String(formData.get('company_id')      ?? '').trim()
    if (!subscriptionId || !companyId) return { error: 'ข้อมูลไม่ครบถ้วน' }

    const amountStr = String(formData.get('amount_baht') ?? '').trim()
    const amount    = Number(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'จำนวนเงินไม่ถูกต้อง' }

    const periodStart = String(formData.get('period_start') ?? '').trim()
    const periodEnd   = String(formData.get('period_end')   ?? '').trim()
    if (!periodStart || !periodEnd) return { error: 'กรุณาระบุช่วงเวลา' }

    // Upload receipt slip if provided
    let receiptPath: string | null = null
    const receiptFile = formData.get('receipt') as File | null
    if (receiptFile && receiptFile.size > 0) {
      const ext = receiptFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const filename = `${Date.now()}.${ext}`
      const uploaded = await storageRepo.upload('receipts', companyId, `payments/${filename}`, receiptFile, {
        contentType: receiptFile.type || 'image/jpeg',
        upsert: false,
      })
      if (!('error' in uploaded)) receiptPath = uploaded.path
    }

    const result = await billingRepo.recordPayment({
      subscription_id: subscriptionId,
      company_id:      companyId,
      amount_baht:     amount,
      paid_at:         String(formData.get('paid_at') ?? new Date().toISOString()),
      method:          (String(formData.get('method') ?? 'bank_transfer')) as PaymentMethod,
      reference_no:    String(formData.get('reference_no') ?? '').trim() || null,
      note:            String(formData.get('note')         ?? '').trim() || null,
      period_start:    periodStart,
      period_end:      periodEnd,
      receipt_path:    receiptPath,
    })
    if (!result) return { error: 'บันทึกการชำระเงินไม่สำเร็จ' }

    // Bump subscription back to active, reset overdue counter, advance period
    const sub = await billingRepo.getSubscriptionByCompany(companyId)
    if (sub) {
      await billingRepo.updateSubscription(sub.id, {
        status:               'active',
        current_period_start: periodStart,
        current_period_end:   periodEnd,
        overdue_months:       0,
      } as Parameters<typeof billingRepo.updateSubscription>[1])
    }

    // Auto-issue invoice
    const plan = sub?.plan_code ?? 'unknown'
    const lines: InvoiceLine[] = [{
      description:     `ค่าบริการ SEA-POS ${plan} (${periodStart.slice(0, 7)})`,
      qty:             1,
      unit_price_baht: amount,
      amount_baht:     amount,
    }]
    const invoice = await billingRepo.issueInvoice({
      company_id:      companyId,
      subscription_id: subscriptionId,
      payment_id:      result.id,
      lines,
    })

    revalidatePath(`/platform/companies/${companyId}`)
    revalidatePath('/platform/invoices')
    return { success: true, id: result.id, invoice_no: invoice?.invoice_no }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Issue invoice manually ───────────────────────────────────────────────────

export async function issueInvoice(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  try {
    await requirePlatformAdmin()
    const companyId      = String(formData.get('company_id')      ?? '').trim()
    const subscriptionId = String(formData.get('subscription_id') ?? '').trim() || null
    const dueAt          = String(formData.get('due_at')          ?? '').trim() || null
    const description    = String(formData.get('description')     ?? '').trim()
    const amount         = Number(formData.get('amount_baht') ?? '0')
    if (!companyId || !description || !Number.isFinite(amount) || amount <= 0) {
      return { error: 'ข้อมูลไม่ครบถ้วน' }
    }
    const lines: InvoiceLine[] = [{ description, qty: 1, unit_price_baht: amount, amount_baht: amount }]
    const result = await billingRepo.issueInvoice({
      company_id: companyId,
      subscription_id: subscriptionId,
      due_at: dueAt,
      lines,
      notes: String(formData.get('notes') ?? '').trim() || null,
    })
    if (!result) return { error: 'ออกใบกำกับภาษีไม่สำเร็จ' }
    revalidatePath('/platform/invoices')
    revalidatePath(`/platform/companies/${companyId}`)
    return { success: true, id: result.id, invoice_no: result.invoice_no }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Get signed URL for a payment receipt ────────────────────────────────────

export async function getReceiptUrl(receiptPath: string): Promise<string | null> {
  await requirePlatformAdmin()
  return storageRepo.createSignedUrl('receipts', receiptPath, 3600)
}

// ─── Void invoice ─────────────────────────────────────────────────────────────

export async function voidInvoice(
  _prev: BillingState,
  formData: FormData
): Promise<BillingState> {
  try {
    await requirePlatformAdmin()
    const id     = String(formData.get('id') ?? '').trim()
    const reason = String(formData.get('void_reason') ?? '').trim()
    if (!id) return { error: 'ไม่พบใบกำกับภาษี' }
    const err = await billingRepo.updateInvoiceStatus(id, 'void', reason || undefined)
    if (err) return { error: err }
    revalidatePath('/platform/invoices')
    revalidatePath(`/platform/invoices/${id}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

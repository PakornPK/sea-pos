'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'

export type CompanyState = { error?: string; success?: boolean } | undefined

/**
 * Company settings the admin can edit. Kept in a `settings` jsonb column on
 * `companies` so future fields can be added without migrations.
 */
export type CompanySettings = {
  receipt_header?:       string   // printed at top of every receipt
  receipt_footer?:       string   // printed at bottom
  tax_id?:               string   // displayed on receipt if set
  phone?:                string
  address?:              string
  vat_mode?:             'none' | 'included' | 'excluded'
  vat_rate?:             number
  /** When false, sales that would push stock below 0 are blocked. Default: true. */
  allow_negative_stock?: boolean
}

export async function updateCompanySettings(
  _prev: CompanyState,
  formData: FormData
): Promise<CompanyState> {
  try {
    const { me } = await requireActionRole(['admin'])
    if (!me.companyId) return { error: 'ไม่พบข้อมูลบริษัทของคุณ' }

    const name = String(formData.get('name') ?? '').trim()
    if (!name) return { error: 'กรุณาระบุชื่อร้าน/บริษัท' }

    const rawVatMode = String(formData.get('vat_mode') ?? 'none')
    const vatMode: 'none' | 'included' | 'excluded' =
      rawVatMode === 'included' || rawVatMode === 'excluded' ? rawVatMode : 'none'
    const rawVatRate = Number(formData.get('vat_rate') ?? 7)
    const vatRate = Number.isFinite(rawVatRate) && rawVatRate >= 0 && rawVatRate <= 100
      ? Math.round(rawVatRate * 100) / 100
      : 7

    const formSettings: CompanySettings = {
      receipt_header:       String(formData.get('receipt_header') ?? '').trim() || undefined,
      receipt_footer:       String(formData.get('receipt_footer') ?? '').trim() || undefined,
      tax_id:               String(formData.get('tax_id')         ?? '').trim() || undefined,
      phone:                String(formData.get('phone')          ?? '').trim() || undefined,
      address:              String(formData.get('address')        ?? '').trim() || undefined,
      vat_mode:             vatMode,
      vat_rate:             vatMode === 'none' ? undefined : vatRate,
      allow_negative_stock: formData.get('allow_negative_stock') !== 'false',
    }

    // Read existing settings to preserve upload-managed fields (logo_url, letterhead_url).
    // Merge: existing first so upload fields survive, form values overwrite on top.
    // Strip undefined so cleared form fields are removed from the JSON, not stored as null.
    const current = await companyRepo.getByIdCached(me.companyId)
    const existing = (current?.settings ?? {}) as Record<string, unknown>
    const settings = Object.fromEntries(
      Object.entries({ ...existing, ...formSettings }).filter(([, v]) => v !== undefined)
    )

    const nameErr = await companyRepo.updateName(me.companyId, name)
    if (nameErr) return { error: nameErr }

    const settingsErr = await companyRepo.updateSettings(me.companyId, settings)
    if (settingsErr) return { error: settingsErr }

    revalidatePath('/settings/company')
    revalidatePath('/', 'layout')  // affects receipt rendering everywhere
    revalidateTag(`company:${me.companyId}`, {})
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

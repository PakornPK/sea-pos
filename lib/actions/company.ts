'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { companyRepo } from '@/lib/repositories'

export type CompanyState = { error?: string; success?: boolean } | undefined

/**
 * Company settings the admin can edit. Kept in a `settings` jsonb column on
 * `companies` so future fields can be added without migrations.
 */
type CompanySettings = {
  receipt_header?: string   // printed at top of every receipt
  receipt_footer?: string   // printed at bottom
  tax_id?:         string   // displayed on receipt if set
  phone?:          string
  address?:        string
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

    const settings: CompanySettings = {
      receipt_header: String(formData.get('receipt_header') ?? '').trim() || undefined,
      receipt_footer: String(formData.get('receipt_footer') ?? '').trim() || undefined,
      tax_id:         String(formData.get('tax_id')         ?? '').trim() || undefined,
      phone:          String(formData.get('phone')          ?? '').trim() || undefined,
      address:        String(formData.get('address')        ?? '').trim() || undefined,
    }

    const nameErr = await companyRepo.updateName(me.companyId, name)
    if (nameErr) return { error: nameErr }

    const settingsErr = await companyRepo.updateSettings(me.companyId, settings as Record<string, unknown>)
    if (settingsErr) return { error: settingsErr }

    revalidatePath('/settings/company')
    revalidatePath('/', 'layout')  // affects receipt rendering everywhere
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { getActionUser } from '@/lib/auth'
import { planRepo } from '@/lib/repositories'

export type PlanState = { error?: string; success?: boolean } | undefined

async function requirePlatformAdmin() {
  const { me } = await getActionUser()
  if (!me.isPlatformAdmin) throw new Error('เฉพาะผู้ดูแลแพลตฟอร์มเท่านั้น')
  return { me }
}

/** Parse "" / undefined as null; otherwise non-negative integer. */
function parseLimit(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'unlimited') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

export async function updatePlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  try {
    await requirePlatformAdmin()

    const code = String(formData.get('code') ?? '').trim()
    const name = String(formData.get('name') ?? '').trim()
    if (!code) return { error: 'ไม่พบรหัสแพ็กเกจ' }
    if (!name) return { error: 'กรุณาระบุชื่อแพ็กเกจ' }

    const priceRaw = String(formData.get('monthly_price_baht') ?? '').trim()
    const price = priceRaw === '' || priceRaw.toLowerCase() === 'contact'
      ? null
      : Number.isFinite(Number(priceRaw)) && Number(priceRaw) >= 0
        ? Number(priceRaw)
        : null

    const err = await planRepo.update(code, {
      name,
      description: String(formData.get('description') ?? '').trim() || null,
      max_products: parseLimit(formData.get('max_products')),
      max_users:    parseLimit(formData.get('max_users')),
      max_branches: parseLimit(formData.get('max_branches')),
      monthly_price_baht: price,
      sort_order: Number(formData.get('sort_order')) || 0,
      is_active: formData.get('is_active') === 'on',
    })
    if (err) return { error: err }

    revalidatePath('/platform/plans')
    revalidatePath('/platform/companies', 'layout')  // plan labels change
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

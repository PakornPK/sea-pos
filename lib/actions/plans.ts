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

function parseLimit(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'unlimited') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function parsePrice(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (s === '' || s.toLowerCase() === 'contact') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parsePlanFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'กรุณาระบุชื่อแพ็กเกจ' as const }
  return {
    name,
    description: String(formData.get('description') ?? '').trim() || null,
    monthly_price_baht: parsePrice(formData.get('monthly_price_baht')),
    yearly_price_baht:  parsePrice(formData.get('yearly_price_baht')),
    max_products: parseLimit(formData.get('max_products')),
    max_users:    parseLimit(formData.get('max_users')),
    max_branches: parseLimit(formData.get('max_branches')),
    sort_order:   Number(formData.get('sort_order')) || 0,
    is_active:    formData.get('is_active') === 'on',
  }
}

export async function updatePlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  try {
    await requirePlatformAdmin()
    const code = String(formData.get('code') ?? '').trim()
    if (!code) return { error: 'ไม่พบรหัสแพ็กเกจ' }
    const fields = parsePlanFields(formData)
    if ('error' in fields) return { error: fields.error }
    const err = await planRepo.update(code, fields)
    if (err) return { error: err }
    revalidatePath('/platform/plans')
    revalidatePath('/platform/companies', 'layout')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function createPlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  try {
    await requirePlatformAdmin()
    const code = String(formData.get('code') ?? '').trim().toLowerCase().replace(/\s+/g, '_')
    if (!code) return { error: 'กรุณาระบุรหัสแพ็กเกจ' }
    if (!/^[a-z0-9_]+$/.test(code)) return { error: 'รหัสแพ็กเกจใช้ได้เฉพาะตัวอักษรพิมพ์เล็ก ตัวเลข และ _' }
    const fields = parsePlanFields(formData)
    if ('error' in fields) return { error: fields.error }
    const err = await planRepo.create(code, fields)
    if (err) return { error: err }
    revalidatePath('/platform/plans')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deletePlan(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  try {
    await requirePlatformAdmin()
    const code = String(formData.get('code') ?? '').trim()
    if (!code) return { error: 'ไม่พบรหัสแพ็กเกจ' }
    const companyCount = Number(formData.get('company_count') ?? '0')
    if (companyCount > 0) return { error: `ไม่สามารถลบได้ — มี ${companyCount} บริษัทที่ใช้แพ็กเกจนี้อยู่` }
    const err = await planRepo.delete(code)
    if (err) return { error: err }
    revalidatePath('/platform/plans')
    revalidatePath('/platform/companies', 'layout')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

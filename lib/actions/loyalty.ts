'use server'

import { revalidatePath } from 'next/cache'
import { getActionUser } from '@/lib/auth'
import { loyaltyRepo } from '@/lib/repositories'

export type LoyaltyState = { error?: string; success?: boolean; id?: string; member_no?: string } | undefined

async function requirePage() {
  const { me } = await getActionUser()
  return { me }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function updateMembershipSettings(
  _prev: LoyaltyState,
  formData: FormData
): Promise<LoyaltyState> {
  try {
    await requirePage()
    const mlmLevels: { level: number; rate_pct: number }[] = []
    for (let i = 1; i <= 5; i++) {
      const ratePct = Number(formData.get(`mlm_level_${i}`) ?? '')
      if (ratePct > 0) mlmLevels.push({ level: i, rate_pct: ratePct })
    }
    const err = await loyaltyRepo.upsertSettings({
      enabled:            formData.get('enabled') === 'on',
      points_per_baht:    Number(formData.get('points_per_baht')   ?? 1),
      baht_per_point:     Number(formData.get('baht_per_point')    ?? 0.1),
      max_redeem_pct:     Number(formData.get('max_redeem_pct')    ?? 20),
      points_expiry_days: Number(formData.get('points_expiry_days') ?? '') || null,
      mlm_enabled:        formData.get('mlm_enabled') === 'on',
      mlm_levels:         mlmLevels,
    })
    if (err) return { error: err }
    revalidatePath('/settings/membership')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Tiers ───────────────────────────────────────────────────────────────────

export async function upsertTier(
  _prev: LoyaltyState,
  formData: FormData
): Promise<LoyaltyState> {
  try {
    await requirePage()
    const id   = String(formData.get('id') ?? '').trim() || null
    const name = String(formData.get('name') ?? '').trim()
    if (!name) return { error: 'กรุณาระบุชื่อระดับ' }
    const err = await loyaltyRepo.upsertTier(id, {
      name,
      color:             String(formData.get('color')             ?? '#6366f1'),
      min_spend_baht:    Number(formData.get('min_spend_baht')    ?? 0),
      discount_pct:      Number(formData.get('discount_pct')      ?? 0),
      points_multiplier: Number(formData.get('points_multiplier') ?? 1),
      sort_order:        Number(formData.get('sort_order')        ?? 0),
    })
    if (err) return { error: err }
    revalidatePath('/settings/membership')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteTier(id: string): Promise<{ error?: string }> {
  try {
    await requirePage()
    const err = await loyaltyRepo.deleteTier(id)
    if (err) return { error: err }
    revalidatePath('/settings/membership')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Enroll ──────────────────────────────────────────────────────────────────

export async function enrollMember(
  _prev: LoyaltyState,
  formData: FormData
): Promise<LoyaltyState> {
  try {
    await requirePage()
    const name               = String(formData.get('name')                   ?? '').trim()
    const phone              = String(formData.get('phone')                  ?? '').trim() || null
    const email              = String(formData.get('email')                  ?? '').trim() || null
    const address            = String(formData.get('address')                ?? '').trim() || null
    const referredByMemberNo = String(formData.get('referred_by_member_no') ?? '').trim() || null
    if (!name) return { error: 'กรุณาระบุชื่อ' }
    const result = await loyaltyRepo.enrollMember({ name, phone, email, address, referred_by_member_no: referredByMemberNo })
    if (!result) return { error: 'สมัครสมาชิกไม่สำเร็จ' }
    revalidatePath('/members')
    return { success: true, id: result.id, member_no: result.member_no }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── Points adjust ───────────────────────────────────────────────────────────

export async function adjustMemberPoints(
  _prev: LoyaltyState,
  formData: FormData
): Promise<LoyaltyState> {
  try {
    await requirePage()
    const memberId = String(formData.get('member_id') ?? '').trim()
    const points   = Number(formData.get('points') ?? 0)
    const note     = String(formData.get('note') ?? '').trim()
    if (!memberId) return { error: 'ไม่พบสมาชิก' }
    if (!Number.isFinite(points) || points === 0) return { error: 'ระบุจำนวนแต้มที่ต้องการปรับ' }
    const err = await loyaltyRepo.adjustPoints(memberId, points, note || 'ปรับแต้มโดยผู้ดูแล')
    if (err) return { error: err }
    revalidatePath(`/members/${memberId}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ─── POS: lookup member by phone (called client-side via server action) ───────

export async function lookupMemberByPhone(
  phone: string
): Promise<{ id: string; member_no: string; name: string; tier_name: string | null; tier_color: string | null; points_balance: number; discount_pct: number } | null> {
  try {
    await requirePage()
    const member = await loyaltyRepo.findMemberByPhone(phone.trim())
    if (!member) return null
    return {
      id:             member.id,
      member_no:      member.member_no,
      name:           member.name,
      tier_name:      member.tier?.name        ?? null,
      tier_color:     member.tier?.color       ?? null,
      points_balance: member.points_balance,
      discount_pct:   member.tier?.discount_pct ?? 0,
    }
  } catch {
    return null
  }
}

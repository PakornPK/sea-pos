'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { userRepo } from '@/lib/repositories'
import { checkUserLimit, formatLimitError } from '@/lib/limits'
import type { UserRole } from '@/types/database'

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'cashier', 'purchasing']

export type UserActionState = { error?: string; success?: boolean } | undefined

/**
 * Every mutation below is scoped to the caller's company. The admin client
 * bypasses RLS, so we enforce tenancy in code: before touching a target
 * user, verify `target.company_id === me.companyId`. This prevents a
 * customer admin from passing another company's user ID via a crafted
 * form submission.
 */
async function assertTargetInMyCompany(targetId: string, myCompanyId: string | null): Promise<void> {
  if (!myCompanyId) throw new Error('ไม่พบข้อมูลบริษัทของคุณ')
  const targetCompanyId = await userRepo.getCompanyId(targetId)
  if (targetCompanyId !== myCompanyId) {
    throw new Error('ไม่มีสิทธิ์ดำเนินการกับผู้ใช้รายนี้')
  }
}

export async function createUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { me } = await requireActionRole(['admin'])
    if (!me.companyId) return { error: 'ไม่พบข้อมูลบริษัทของคุณ' }

    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    const full_name = String(formData.get('full_name') ?? '').trim() || null
    const role = String(formData.get('role') ?? 'cashier') as UserRole

    if (!email) return { error: 'กรุณาระบุอีเมล' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' }
    if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
    if (!VALID_ROLES.includes(role)) return { error: 'บทบาทไม่ถูกต้อง' }

    // Plan limit: block inserts when the company has reached its user cap.
    const currentCount = await userRepo.countByCompany(me.companyId)
    const usage = await checkUserLimit(currentCount)
    if (usage?.reached) return { error: formatLimitError('user', usage) }

    const res = await userRepo.create({
      email, password, role, full_name,
      companyId: me.companyId,
    })
    if ('error' in res) return { error: res.error }

    revalidatePath('/users')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateUser(formData: FormData): Promise<void> {
  const { me } = await requireActionRole(['admin'])

  const id = String(formData.get('id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  const full_name = String(formData.get('full_name') ?? '').trim() || null

  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (!VALID_ROLES.includes(role)) throw new Error('บทบาทไม่ถูกต้อง')
  await assertTargetInMyCompany(id, me.companyId)

  const err = await userRepo.updateProfile(id, { role, full_name })
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  const { me } = await requireActionRole(['admin'])

  const id = String(formData.get('id') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  await assertTargetInMyCompany(id, me.companyId)

  const err = await userRepo.updatePassword(id, password)
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function forceSignOutUser(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (me.id === id) throw new Error('ใช้ปุ่ม "ออกจากระบบ" เพื่อออกจากบัญชีตัวเอง')
  await assertTargetInMyCompany(id, me.companyId)

  const err = await userRepo.forceSignOut(id, 'global')
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function deleteUser(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (me.id === id) throw new Error('ไม่สามารถลบบัญชีตัวเองได้')
  await assertTargetInMyCompany(id, me.companyId)

  const err = await userRepo.delete(id)
  if (err) throw new Error(err)

  revalidatePath('/users')
}

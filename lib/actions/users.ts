'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { userRepo, branchRepo } from '@/lib/repositories'
import { checkUserLimit, formatLimitError } from '@/lib/limits'
import type { UserRole } from '@/types/database'

function parseBranchIds(formData: FormData): string[] {
  // Accepts repeated `branch_ids` fields or a single comma-joined value.
  const ids = formData.getAll('branch_ids').map((v) => String(v)).filter(Boolean)
  return Array.from(new Set(ids))
}

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

    const email      = String(formData.get('email') ?? '').trim().toLowerCase()
    const password   = String(formData.get('password') ?? '')
    const first_name = String(formData.get('first_name') ?? '').trim() || null
    const last_name  = String(formData.get('last_name')  ?? '').trim() || null
    const full_name  = [first_name, last_name].filter(Boolean).join(' ') || null
    const role = String(formData.get('role') ?? 'cashier') as UserRole

    if (!email) return { error: 'กรุณาระบุอีเมล' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' }
    if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
    if (!VALID_ROLES.includes(role)) return { error: 'บทบาทไม่ถูกต้อง' }

    const branchIds = parseBranchIds(formData)
    const defaultBranchId = String(formData.get('default_branch_id') ?? '') || null
    if (branchIds.length === 0) return { error: 'กรุณาเลือกอย่างน้อย 1 สาขา' }
    if (defaultBranchId && !branchIds.includes(defaultBranchId)) {
      return { error: 'สาขาเริ่มต้นต้องเป็นสาขาที่เลือก' }
    }

    // Plan limit: block inserts when the company has reached its user cap.
    const currentCount = await userRepo.countByCompany(me.companyId)
    const usage = await checkUserLimit(currentCount)
    if (usage?.reached) return { error: formatLimitError('user', usage) }

    const res = await userRepo.create({
      email, password, role, first_name, last_name, full_name,
      companyId: me.companyId,
    })
    if ('error' in res) return { error: res.error }

    const assignErr = await branchRepo.setUserBranches({
      userId: res.id,
      branchIds,
      defaultBranchId: defaultBranchId ?? branchIds[0],
    })
    if (assignErr) return { error: `สร้างผู้ใช้สำเร็จ แต่มอบหมายสาขาไม่สำเร็จ: ${assignErr}` }

    revalidatePath('/users')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateUser(formData: FormData): Promise<void> {
  const { me } = await requireActionRole(['admin'])

  const id         = String(formData.get('id') ?? '')
  const role       = String(formData.get('role') ?? '') as UserRole
  const first_name = String(formData.get('first_name') ?? '').trim() || null
  const last_name  = String(formData.get('last_name')  ?? '').trim() || null
  const full_name  = [first_name, last_name].filter(Boolean).join(' ') || null

  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (!VALID_ROLES.includes(role)) throw new Error('บทบาทไม่ถูกต้อง')
  await assertTargetInMyCompany(id, me.companyId)

  const err = await userRepo.updateProfile(id, { role, first_name, last_name, full_name })
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

export async function updateUserBranches(formData: FormData): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('ไม่พบผู้ใช้')
  await assertTargetInMyCompany(id, me.companyId)

  const branchIds = parseBranchIds(formData)
  const defaultBranchId = String(formData.get('default_branch_id') ?? '') || null

  if (branchIds.length === 0) throw new Error('กรุณาเลือกอย่างน้อย 1 สาขา')
  if (defaultBranchId && !branchIds.includes(defaultBranchId)) {
    throw new Error('สาขาเริ่มต้นต้องเป็นสาขาที่เลือก')
  }

  const err = await branchRepo.setUserBranches({
    userId: id,
    branchIds,
    defaultBranchId: defaultBranchId ?? branchIds[0],
  })
  if (err) throw new Error(err)

  revalidatePath('/users')
  revalidatePath('/', 'layout')
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

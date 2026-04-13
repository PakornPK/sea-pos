'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { userRepo } from '@/lib/repositories'
import type { UserRole } from '@/types/database'

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'cashier', 'purchasing']

export type UserActionState = { error?: string; success?: boolean } | undefined

export async function createUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    await requireActionRole(['admin'])

    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')
    const full_name = String(formData.get('full_name') ?? '').trim() || null
    const role = String(formData.get('role') ?? 'cashier') as UserRole

    if (!email) return { error: 'กรุณาระบุอีเมล' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'รูปแบบอีเมลไม่ถูกต้อง' }
    if (password.length < 8) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
    if (!VALID_ROLES.includes(role)) return { error: 'บทบาทไม่ถูกต้อง' }

    const res = await userRepo.create({ email, password, role, full_name })
    if ('error' in res) return { error: res.error }

    revalidatePath('/users')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateUser(formData: FormData): Promise<void> {
  await requireActionRole(['admin'])

  const id = String(formData.get('id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  const full_name = String(formData.get('full_name') ?? '').trim() || null

  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (!VALID_ROLES.includes(role)) throw new Error('บทบาทไม่ถูกต้อง')

  const err = await userRepo.updateProfile(id, { role, full_name })
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireActionRole(['admin'])

  const id = String(formData.get('id') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')

  const err = await userRepo.updatePassword(id, password)
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function forceSignOutUser(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (me.id === id) throw new Error('ใช้ปุ่ม "ออกจากระบบ" เพื่อออกจากบัญชีตัวเอง')

  const err = await userRepo.forceSignOut(id, 'global')
  if (err) throw new Error(err)

  revalidatePath('/users')
}

export async function deleteUser(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (me.id === id) throw new Error('ไม่สามารถลบบัญชีตัวเองได้')

  const err = await userRepo.delete(id)
  if (err) throw new Error(err)

  revalidatePath('/users')
}

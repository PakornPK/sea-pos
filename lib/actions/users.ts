'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
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

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name },
    })
    if (error) return { error: error.message }

    // handle_new_user trigger inserts profile from metadata, but ensure it's correct
    await admin.from('profiles').upsert({ id: data.user.id, role, full_name })

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

  const admin = createAdminClient()
  const { error } = await admin.from('profiles')
    .update({ role, full_name }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/users')
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  await requireActionRole(['admin'])

  const id = String(formData.get('id') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) throw new Error(error.message)

  revalidatePath('/users')
}

export async function deleteUser(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้ใช้')
  if (me.id === id) throw new Error('ไม่สามารถลบบัญชีตัวเองได้')

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  revalidatePath('/users')
}

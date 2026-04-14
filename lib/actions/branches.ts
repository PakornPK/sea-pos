'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { hardenCookieOptions } from '@/lib/supabase/cookie-options'
import { branchRepo } from '@/lib/repositories'
import { checkBranchLimit, formatLimitError } from '@/lib/limits'

export type BranchState = { error?: string; success?: boolean } | undefined

/**
 * Normalize branch code: uppercase, alphanumeric only. e.g. 'b01 ' → 'B01'.
 * Empty → null; non-empty → at most 10 chars so receipt numbers stay short.
 */
function cleanCode(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s ? s.slice(0, 10) : null
}

function parseForm(formData: FormData) {
  return {
    name:    String(formData.get('name')    ?? '').trim(),
    code:    cleanCode(formData.get('code') as string | null) ?? '',
    address: String(formData.get('address') ?? '').trim() || null,
    phone:   String(formData.get('phone')   ?? '').trim() || null,
    tax_id:  String(formData.get('tax_id')  ?? '').trim() || null,
  }
}

export async function createBranch(
  _prev: BranchState,
  formData: FormData,
): Promise<BranchState> {
  try {
    const { me } = await requireActionRole(['admin'])
    if (!me.companyId) return { error: 'ไม่พบข้อมูลบริษัทของคุณ' }

    const input = parseForm(formData)
    if (!input.name) return { error: 'กรุณาระบุชื่อสาขา' }
    if (!input.code) return { error: 'กรุณาระบุรหัสสาขา' }

    const currentCount = await branchRepo.countForCompany(me.companyId)
    const usage = await checkBranchLimit(currentCount)
    if (usage?.reached) return { error: formatLimitError('branch', usage) }

    const res = await branchRepo.create(input)
    if ('error' in res) return { error: res.error }

    revalidatePath('/settings/branches')
    revalidatePath('/', 'layout')   // picker lists change
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateBranch(
  _prev: BranchState,
  formData: FormData,
): Promise<BranchState> {
  try {
    await requireActionRole(['admin'])
    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบสาขา' }

    const input = parseForm(formData)
    if (!input.name) return { error: 'กรุณาระบุชื่อสาขา' }
    if (!input.code) return { error: 'กรุณาระบุรหัสสาขา' }

    const err = await branchRepo.update(id, input)
    if (err) return { error: err }

    revalidatePath('/settings/branches')
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function setBranchDefault(id: string): Promise<void> {
  await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบสาขา')
  const err = await branchRepo.setDefault(id)
  if (err) throw new Error(err)
  revalidatePath('/settings/branches')
  revalidatePath('/', 'layout')
}

export async function deleteBranch(id: string): Promise<void> {
  await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบสาขา')
  const err = await branchRepo.delete(id)
  if (err) throw new Error(err)
  revalidatePath('/settings/branches')
  revalidatePath('/', 'layout')
}

/**
 * Set the caller's active branch via a cookie. The proxy forwards this
 * value as `x-sea-branch`, which `lib/auth.ts` validates against
 * `user_branches` so a crafted cookie can't leak cross-branch access.
 */
export async function setActiveBranch(branchId: string): Promise<void> {
  const { me } = await getActionUser()

  // Validate: must be one of the caller's assigned branches, or the
  // caller is a company admin (who can operate on any branch).
  // (We don't check the role=admin path here because it still requires
  // their company to contain the branch — RLS handles that at read time.)
  const allowed = me.branchIds.includes(branchId) || me.role === 'admin'
  if (!allowed) throw new Error('ไม่มีสิทธิ์เข้าถึงสาขานี้')

  const jar = await cookies()
  jar.set(
    'sea-branch',
    branchId,
    hardenCookieOptions({
      path: '/',
      maxAge: 60 * 60 * 24 * 30,   // 30 days
    }),
  )

  // Almost every page is branch-scoped — invalidate the whole tree.
  revalidatePath('/', 'layout')
}

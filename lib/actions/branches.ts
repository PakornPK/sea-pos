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
    const input = parseForm(formData)
    if (!input.name) return { error: 'กรุณาระบุชื่อสาขา' }
    if (!input.code) return { error: 'กรุณาระบุรหัสสาขา' }

    const currentCount = await branchRepo.countForCompany('')
    const usage = await checkBranchLimit(currentCount)
    if (usage?.reached) return { error: formatLimitError('branch', usage) }

    const res = await branchRepo.create(input)
    if ('error' in res) return { error: res.error }

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
    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบสาขา' }

    const input = parseForm(formData)
    if (!input.name) return { error: 'กรุณาระบุชื่อสาขา' }
    if (!input.code) return { error: 'กรุณาระบุรหัสสาขา' }

    const err = await branchRepo.update(id, input)
    if (err) return { error: err }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function setBranchDefault(id: string): Promise<void> {
  if (!id) throw new Error('ไม่พบสาขา')
  const err = await branchRepo.setDefault(id)
  if (err) throw new Error(err)
}

export async function deleteBranch(id: string): Promise<void> {
  if (!id) throw new Error('ไม่พบสาขา')
  const err = await branchRepo.delete(id)
  if (err) throw new Error(err)
}

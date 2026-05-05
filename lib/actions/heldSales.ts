import { heldSaleRepo, type HeldSaleListRow } from '@/lib/repositories'
import type { HeldSale, HeldSaleItem } from '@/types/database'

export type HoldState = { error?: string; success?: boolean } | undefined

/**
 * Park the current cart. Accepts the cart snapshot + optional customer + note.
 * The cart items are stored verbatim in a JSONB column — stock hasn't moved,
 * no receipt number issued. Resume re-hydrates into the live POS cart.
 */
export async function holdSale(
  _prev: HoldState,
  formData: FormData,
): Promise<HoldState> {
  try {
    const branchId  = String(formData.get('branchId') ?? '').trim()
    const userId    = String(formData.get('userId')   ?? '').trim()
    const itemsRaw  = String(formData.get('items') ?? '')
    const memberId  = String(formData.get('memberId') ?? '').trim() || null
    const note      = String(formData.get('note') ?? '').trim() || null

    if (!branchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

    let items: HeldSaleItem[]
    try {
      const parsed = JSON.parse(itemsRaw)
      if (!Array.isArray(parsed)) return { error: 'ข้อมูลตะกร้าไม่ถูกต้อง' }
      items = parsed as HeldSaleItem[]
    } catch {
      return { error: 'ข้อมูลตะกร้าไม่ถูกต้อง' }
    }
    if (items.length === 0) return { error: 'ไม่มีสินค้าในตะกร้า' }

    const res = await heldSaleRepo.create({
      branch_id: branchId,
      user_id:   userId,
      member_id: memberId,
      items,
      note,
    })
    if ('error' in res) return { error: res.error }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

/** List held bills at the given branch. Newest first. */
export async function listHeldSales(branchId: string): Promise<HeldSaleListRow[]> {
  if (!branchId) return []
  const rows = await heldSaleRepo.listForBranch(branchId)
  return rows
}

/**
 * Load a held bill and delete it atomically — the caller re-hydrates their
 * live cart from the returned snapshot. If the delete fails we still return
 * the snapshot (better UX than blocking on a stale row).
 */
export async function resumeHeldSale(id: string, branchId: string): Promise<HeldSale | null> {
  if (!branchId) return null

  const snapshot = await heldSaleRepo.getById(id)
  if (!snapshot) return null
  // Safety: refuse to resume a bill held at a different branch.
  if (snapshot.branch_id !== branchId) return null

  await heldSaleRepo.delete(id)
  return snapshot
}

export async function deleteHeldSale(id: string): Promise<void> {
  const err = await heldSaleRepo.delete(id)
  if (err) throw new Error(err)
}

'use server'

import { revalidatePath } from 'next/cache'
import { getActionUser } from '@/lib/auth'
import { heldSaleRepo, type HeldSaleListRow } from '@/lib/repositories'
import type { HeldSale, HeldSaleItem } from '@/types/database'

export type HoldState = { error?: string; success?: boolean } | undefined

const SELL_ROLES = ['admin', 'manager', 'cashier'] as const

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
    const { me } = await getActionUser()
    if (!(SELL_ROLES as readonly string[]).includes(me.role)) {
      return { error: 'ไม่มีสิทธิ์ขายสินค้า' }
    }
    if (!me.activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

    const itemsRaw   = String(formData.get('items') ?? '')
    const customerId = String(formData.get('customerId') ?? '').trim() || null
    const note       = String(formData.get('note') ?? '').trim() || null

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
      branch_id:   me.activeBranchId,
      user_id:     me.id,
      customer_id: customerId,
      items,
      note,
    })
    if ('error' in res) return { error: res.error }

    revalidatePath('/pos')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

/** List held bills at the caller's active branch. Newest first. */
export async function listHeldSales(): Promise<HeldSaleListRow[]> {
  const { me } = await getActionUser()
  if (!me.activeBranchId) return []
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) return []
  const rows = await heldSaleRepo.listForBranch(me.activeBranchId)
  return rows
}

/**
 * Load a held bill and delete it atomically — the caller re-hydrates their
 * live cart from the returned snapshot. If the delete fails we still return
 * the snapshot (better UX than blocking on a stale row).
 */
export async function resumeHeldSale(id: string): Promise<HeldSale | null> {
  const { me } = await getActionUser()
  if (!me.activeBranchId) return null
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) return null

  const snapshot = await heldSaleRepo.getById(id)
  if (!snapshot) return null
  // Safety: refuse to resume a bill held at a different branch.
  if (snapshot.branch_id !== me.activeBranchId) return null

  await heldSaleRepo.delete(id)
  revalidatePath('/pos')
  return snapshot
}

export async function deleteHeldSale(id: string): Promise<void> {
  const { me } = await getActionUser()
  if (!me.activeBranchId) throw new Error('ไม่พบสาขาที่ใช้งาน')
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) {
    throw new Error('ไม่มีสิทธิ์')
  }
  const err = await heldSaleRepo.delete(id)
  if (err) throw new Error(err)
  revalidatePath('/pos')
}

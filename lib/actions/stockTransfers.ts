'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActionRole } from '@/lib/auth'
import { stockTransferRepo } from '@/lib/repositories'

export type StockTransferState = { error?: string; success?: boolean } | undefined

const MANAGE_ROLES = ['admin', 'manager'] as const

type LineInput = { productId: string; quantitySent: number }

function parseLines(raw: unknown): LineInput[] {
  if (typeof raw !== 'string') return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((it: unknown) => {
        const o = it as Record<string, unknown>
        return {
          productId:    String(o.productId ?? ''),
          quantitySent: Number(o.quantitySent ?? 0),
        }
      })
      .filter((l) => l.productId && l.quantitySent > 0)
  } catch {
    return []
  }
}

export async function createStockTransfer(
  _prev: StockTransferState,
  formData: FormData,
): Promise<StockTransferState> {
  let newId: string | null = null
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])
    if (!me.activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

    const toBranchId = String(formData.get('to_branch_id') ?? '')
    const notes      = String(formData.get('notes') ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!toBranchId) return { error: 'กรุณาเลือกสาขาปลายทาง' }
    if (toBranchId === me.activeBranchId) {
      return { error: 'สาขาปลายทางต้องเป็นคนละสาขากับสาขาต้นทาง' }
    }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้า' }

    const res = await stockTransferRepo.create({
      from_branch_id: me.activeBranchId,
      to_branch_id:   toBranchId,
      notes,
      user_id:        me.id,
      items:          lines.map((l) => ({
        product_id:    l.productId,
        quantity_sent: l.quantitySent,
      })),
    })
    if ('error' in res) return { error: res.error }

    // Immediately debit source stock + mark in_transit. If this fails
    // (e.g. insufficient stock), we delete the header so we don't leave
    // a zombie draft behind.
    const sendErr = await stockTransferRepo.send(res.id, me.id)
    if (sendErr) {
      await stockTransferRepo.cancel(res.id, me.id).catch(() => {})
      return { error: `สร้างรายการโอนไม่สำเร็จ: ${sendErr}` }
    }

    newId = res.id
    revalidatePath('/inventory')
    revalidatePath('/inventory/transfers')
    revalidatePath('/reports')
    revalidatePath('/dashboard')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
  if (newId) redirect(`/inventory/transfers/${newId}`)
  return { error: 'เกิดข้อผิดพลาด' }
}

/**
 * Receive a transfer. FormData encoding:
 *   id                              — transfer id
 *   recv__{itemId}                  — quantity received for that item
 *   note__{itemId}                  — optional discrepancy note
 *
 * If the form carries no `recv__*` fields (e.g. programmatic submit via the
 * simple "รับครบ" button), every item is received in full.
 */
export async function receiveStockTransfer(
  _prev: StockTransferState,
  formData: FormData,
): Promise<StockTransferState> {
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบรายการโอน' }

    const overrides: Array<{ itemId: string; quantityReceived: number; receiveNote: string | null }> = []
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('recv__')) continue
      const itemId = key.slice('recv__'.length)
      const qty = Number(val)
      if (!Number.isFinite(qty) || qty < 0) {
        return { error: 'จำนวนที่รับต้องเป็นตัวเลขและไม่น้อยกว่า 0' }
      }
      const noteRaw = formData.get(`note__${itemId}`)
      const note = noteRaw == null ? null : String(noteRaw).trim() || null
      overrides.push({ itemId, quantityReceived: qty, receiveNote: note })
    }

    const err = await stockTransferRepo.receive(
      id,
      me.id,
      overrides.length > 0 ? overrides : undefined,
    )
    if (err) return { error: err }

    revalidatePath('/inventory')
    revalidatePath('/inventory/transfers')
    revalidatePath(`/inventory/transfers/${id}`)
    revalidatePath('/reports')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function cancelStockTransfer(id: string): Promise<void> {
  const { me } = await requireActionRole([...MANAGE_ROLES])
  if (!id) throw new Error('ไม่พบรายการโอน')

  const err = await stockTransferRepo.cancel(id, me.id)
  if (err) throw new Error(err)

  revalidatePath('/inventory')
  revalidatePath('/inventory/transfers')
  revalidatePath(`/inventory/transfers/${id}`)
  revalidatePath('/reports')
  revalidatePath('/dashboard')
}

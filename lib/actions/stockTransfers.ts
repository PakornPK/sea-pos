import { stockTransferRepo, branchRepo, productRepo, type StockTransferListRow } from '@/lib/repositories'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import type { Branch, ProductWithStock } from '@/types/database'

export type { StockTransferListRow as TransferListRow }

export async function listTransfers(opts?: { branchId?: string | null }): Promise<{
  rows: StockTransferListRow[]
  activeBranchName: string | null
}> {
  const rows = await stockTransferRepo.list({ branchId: opts?.branchId })
  return { rows, activeBranchName: null }
}

import type { StockTransferDetail } from '@/lib/repositories/contracts/stockTransfer'
export type { StockTransferDetail as TransferDetail }

export async function getTransferDetail(id: string): Promise<StockTransferDetail | null> {
  return stockTransferRepo.getById(id)
}

export type TransferFormData = {
  fromBranch: Branch | null
  toBranchCandidates: Branch[]
  productsAtSource: ProductWithStock[]
}

export async function getTransferFormData(activeBranchId: string | null): Promise<TransferFormData> {
  const [allBranches, productsPage, fromBranch] = await Promise.all([
    branchRepo.list(),
    activeBranchId
      ? productRepo.listInStockForBranchPaginated(
          { page: 1, pageSize: 500 },
          { branchId: activeBranchId },
        )
      : Promise.resolve({ rows: [] as ProductWithStock[], totalCount: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, totalPages: 1 }),
    activeBranchId ? branchRepo.getById(activeBranchId) : Promise.resolve(null),
  ])
  const toBranchCandidates = allBranches.filter((b) => b.id !== activeBranchId)
  return { fromBranch, toBranchCandidates, productsAtSource: productsPage.rows }
}

export type StockTransferState = { error?: string; success?: boolean; redirectTo?: string } | undefined

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
  try {
    const activeBranchId = (formData.get('activeBranchId') as string) || null
    const userId         = (formData.get('userId')         as string) || ''

    if (!activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

    const toBranchId = String(formData.get('to_branch_id') ?? '')
    const notes      = String(formData.get('notes') ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!toBranchId) return { error: 'กรุณาเลือกสาขาปลายทาง' }
    if (toBranchId === activeBranchId) {
      return { error: 'สาขาปลายทางต้องเป็นคนละสาขากับสาขาต้นทาง' }
    }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้า' }

    const res = await stockTransferRepo.create({
      from_branch_id: activeBranchId,
      to_branch_id:   toBranchId,
      notes,
      user_id:        userId,
      items:          lines.map((l) => ({
        product_id:    l.productId,
        quantity_sent: l.quantitySent,
      })),
    })
    if ('error' in res) return { error: res.error }

    // Immediately debit source stock + mark in_transit. If this fails
    // (e.g. insufficient stock), we delete the header so we don't leave
    // a zombie draft behind.
    const sendErr = await stockTransferRepo.send(res.id, userId)
    if (sendErr) {
      await stockTransferRepo.cancel(res.id, userId).catch(() => {})
      return { error: `สร้างรายการโอนไม่สำเร็จ: ${sendErr}` }
    }

    return { redirectTo: `/inventory/transfers/detail/?id=${res.id}` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

/**
 * Receive a transfer. FormData encoding:
 *   id                              — transfer id
 *   userId                          — acting user id
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
    const userId = (formData.get('userId') as string) || ''

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบรายการโอน' }

    const overrides: Array<{ itemId: string; quantityReceived: number; receiveNote: string | null }> = []
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('recv__')) continue
      const itemId = key.slice('recv__'.length)
      const qtyVal = Number(val)
      if (!Number.isFinite(qtyVal) || qtyVal < 0) {
        return { error: 'จำนวนที่รับต้องเป็นตัวเลขและไม่น้อยกว่า 0' }
      }
      const noteRaw = formData.get(`note__${itemId}`)
      const note = noteRaw == null ? null : String(noteRaw).trim() || null
      overrides.push({ itemId, quantityReceived: qtyVal, receiveNote: note })
    }

    const err = await stockTransferRepo.receive(
      id,
      userId,
      overrides.length > 0 ? overrides : undefined,
    )
    if (err) return { error: err }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function cancelStockTransfer(id: string, userId = ''): Promise<void> {
  if (!id) throw new Error('ไม่พบรายการโอน')

  const err = await stockTransferRepo.cancel(id, userId)
  if (err) throw new Error(err)
}

// Re-export for documentation purposes
export { MANAGE_ROLES }

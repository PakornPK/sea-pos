'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActionRole } from '@/lib/auth'
import { purchaseOrderRepo, type POLineInput } from '@/lib/repositories'

export type POState = { error?: string; success?: boolean } | undefined

const MANAGE_ROLES = ['admin', 'manager', 'purchasing'] as const

type POLineFormInput = {
  productId: string
  quantity: number
  unitCost: number
}

function parseLines(raw: unknown): POLineFormInput[] {
  if (typeof raw !== 'string') return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((it: unknown) => {
        const obj = it as Record<string, unknown>
        return {
          productId: String(obj.productId ?? ''),
          quantity:  Number(obj.quantity  ?? 0),
          unitCost:  Number(obj.unitCost  ?? 0),
        }
      })
      .filter((l) => l.productId && l.quantity > 0)
  } catch {
    return []
  }
}

function toRepoLines(lines: POLineFormInput[]): POLineInput[] {
  return lines.map((l) => ({
    product_id:       l.productId,
    quantity_ordered: l.quantity,
    unit_cost:        l.unitCost,
  }))
}

function sumTotal(lines: POLineFormInput[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)
}

export async function createPurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  let newPoId: string | null = null
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])

    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))
    const rawBranch  = String(formData.get('branchId') ?? '').trim()

    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    // Branch: explicit picker wins (if supplied), else fall back to active branch.
    // Non-admins can only create POs at a branch they're assigned to.
    const branchId = rawBranch || me.activeBranchId
    if (!branchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }
    const isAdmin = me.role === 'admin' || me.isPlatformAdmin
    if (!isAdmin && !me.branchIds.includes(branchId)) {
      return { error: 'ไม่มีสิทธิ์สร้างใบสั่งซื้อที่สาขานี้' }
    }

    const header = await purchaseOrderRepo.createHeader({
      supplier_id:  supplierId,
      user_id:      me.id,
      branch_id:    branchId,
      total_amount: sumTotal(lines),
      notes,
    })
    if ('error' in header) return { error: header.error }
    newPoId = header.id

    const itemsErr = await purchaseOrderRepo.replaceItems(header.id, toRepoLines(lines))
    if (itemsErr) return { error: itemsErr }

    revalidatePath('/purchasing')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
  if (newPoId) redirect(`/purchasing/${newPoId}`)
  return { error: 'เกิดข้อผิดพลาด' }
}

export async function updatePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    await requireActionRole([...MANAGE_ROLES])

    const id         = String(formData.get('id')         ?? '')
    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!id)                return { error: 'ไม่พบใบสั่งซื้อ' }
    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    const status = await purchaseOrderRepo.getStatus(id)
    if (!status) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (status !== 'draft') return { error: 'แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่างเท่านั้น' }

    const itemsErr = await purchaseOrderRepo.replaceItems(id, toRepoLines(lines))
    if (itemsErr) return { error: itemsErr }

    const updateErr = await purchaseOrderRepo.updateHeader(id, {
      supplier_id:  supplierId,
      notes,
      total_amount: sumTotal(lines),
    })
    if (updateErr) return { error: updateErr }

    revalidatePath('/purchasing')
    revalidatePath(`/purchasing/${id}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function confirmPurchaseOrder(id: string): Promise<void> {
  await requireActionRole([...MANAGE_ROLES])
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const err = await purchaseOrderRepo.confirm(id)
  if (err) throw new Error(err)

  revalidatePath('/purchasing')
  revalidatePath(`/purchasing/${id}`)
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  await requireActionRole([...MANAGE_ROLES])
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const status = await purchaseOrderRepo.getStatus(id)
  if (!status) throw new Error('ไม่พบใบสั่งซื้อ')
  if (status === 'received')  throw new Error('ใบสั่งซื้อที่รับของแล้วไม่สามารถยกเลิกได้')
  if (status === 'cancelled') throw new Error('ใบสั่งซื้อถูกยกเลิกแล้ว')

  const err = await purchaseOrderRepo.cancel(id)
  if (err) throw new Error(err)

  revalidatePath('/purchasing')
  revalidatePath(`/purchasing/${id}`)
}

export async function receivePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบใบสั่งซื้อ' }

    const receipts: { itemId: string; qty: number }[] = []
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('qty__')) continue
      const itemId = key.slice('qty__'.length)
      const qty    = Number(val)
      if (qty > 0) receipts.push({ itemId, qty })
    }

    if (receipts.length === 0) return { error: 'กรุณาระบุจำนวนที่รับอย่างน้อย 1 รายการ' }

    const status = await purchaseOrderRepo.getStatus(id)
    if (!status) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (status !== 'ordered') return { error: 'รับของได้เฉพาะใบสั่งซื้อสถานะ "สั่งซื้อแล้ว"' }

    for (const r of receipts) {
      const err = await purchaseOrderRepo.receiveItem({
        itemId: r.itemId,
        qty:    r.qty,
        userId: me.id,
      })
      if (err) return { error: `รับของไม่สำเร็จ: ${err}` }
    }

    revalidatePath('/inventory')
    revalidatePath('/purchasing')
    revalidatePath(`/purchasing/${id}`)
    revalidatePath('/reports')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

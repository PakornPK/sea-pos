'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActionRole } from '@/lib/auth'

export type POState = { error?: string; success?: boolean } | undefined

const MANAGE_ROLES = ['admin', 'manager', 'purchasing'] as const

type POLineInput = {
  productId: string
  quantity: number
  unitCost: number
}

function parseLines(raw: unknown): POLineInput[] {
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

function sumTotal(lines: POLineInput[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)
}

// ── CREATE PO (draft) ─────────────────────────────────────────
export async function createPurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  let newPoId: string | null = null
  try {
    const { supabase, me } = await requireActionRole([...MANAGE_ROLES])

    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id:  supplierId,
        user_id:      me.id,
        status:       'draft',
        total_amount: sumTotal(lines),
        notes,
      })
      .select('id')
      .single()

    if (error || !po) return { error: error?.message ?? 'ไม่สามารถบันทึกใบสั่งซื้อได้' }
    newPoId = po.id

    const { error: itemsError } = await supabase.from('purchase_order_items').insert(
      lines.map((l) => ({
        po_id:            po.id,
        product_id:       l.productId,
        quantity_ordered: l.quantity,
        unit_cost:        l.unitCost,
      }))
    )
    if (itemsError) return { error: itemsError.message }

    revalidatePath('/purchasing')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
  if (newPoId) redirect(`/purchasing/${newPoId}`)
  return { error: 'เกิดข้อผิดพลาด' }
}

// ── UPDATE DRAFT PO (supplier/notes/lines) ────────────────────
export async function updatePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const { supabase } = await requireActionRole([...MANAGE_ROLES])

    const id         = String(formData.get('id')         ?? '')
    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!id)                return { error: 'ไม่พบใบสั่งซื้อ' }
    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    const { data: po, error: fetchErr } = await supabase
      .from('purchase_orders').select('status').eq('id', id).single()
    if (fetchErr || !po) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (po.status !== 'draft') return { error: 'แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่างเท่านั้น' }

    await supabase.from('purchase_order_items').delete().eq('po_id', id)

    const { error: itemsError } = await supabase.from('purchase_order_items').insert(
      lines.map((l) => ({
        po_id:            id,
        product_id:       l.productId,
        quantity_ordered: l.quantity,
        unit_cost:        l.unitCost,
      }))
    )
    if (itemsError) return { error: itemsError.message }

    const { error: updateErr } = await supabase
      .from('purchase_orders')
      .update({
        supplier_id:  supplierId,
        notes,
        total_amount: sumTotal(lines),
      })
      .eq('id', id)

    if (updateErr) return { error: updateErr.message }

    revalidatePath('/purchasing')
    revalidatePath(`/purchasing/${id}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// ── CONFIRM (draft → ordered) ─────────────────────────────────
export async function confirmPurchaseOrder(id: string): Promise<void> {
  const { supabase } = await requireActionRole([...MANAGE_ROLES])
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'ordered', ordered_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)

  revalidatePath('/purchasing')
  revalidatePath(`/purchasing/${id}`)
}

// ── CANCEL (draft/ordered → cancelled) ────────────────────────
export async function cancelPurchaseOrder(id: string): Promise<void> {
  const { supabase } = await requireActionRole([...MANAGE_ROLES])
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const { data: po } = await supabase
    .from('purchase_orders').select('status').eq('id', id).single()

  if (!po) throw new Error('ไม่พบใบสั่งซื้อ')
  if (po.status === 'received')  throw new Error('ใบสั่งซื้อที่รับของแล้วไม่สามารถยกเลิกได้')
  if (po.status === 'cancelled') throw new Error('ใบสั่งซื้อถูกยกเลิกแล้ว')

  const { error } = await supabase
    .from('purchase_orders').update({ status: 'cancelled' }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/purchasing')
  revalidatePath(`/purchasing/${id}`)
}

// ── RECEIVE (partial) — bumps stock via SECURITY DEFINER RPC ──
export async function receivePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const { supabase, me } = await requireActionRole([...MANAGE_ROLES])

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

    const { data: po } = await supabase
      .from('purchase_orders').select('status').eq('id', id).single()
    if (!po) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (po.status !== 'ordered') {
      return { error: 'รับของได้เฉพาะใบสั่งซื้อสถานะ "สั่งซื้อแล้ว"' }
    }

    for (const r of receipts) {
      const { error } = await supabase.rpc('receive_po_item', {
        p_item_id: r.itemId,
        p_qty:     r.qty,
        p_user_id: me.id,
      })
      if (error) return { error: `รับของไม่สำเร็จ: ${error.message}` }
    }

    revalidatePath('/inventory')
    revalidatePath('/purchasing')
    revalidatePath(`/purchasing/${id}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

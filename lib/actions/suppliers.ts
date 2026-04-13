'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'

export type SupplierState = { error?: string; success?: boolean } | undefined

const MANAGE_ROLES = ['admin', 'manager', 'purchasing'] as const

function parseForm(formData: FormData) {
  return {
    name:         String(formData.get('name')         ?? '').trim(),
    contact_name: String(formData.get('contact_name') ?? '').trim() || null,
    phone:        String(formData.get('phone')        ?? '').trim() || null,
    email:        String(formData.get('email')        ?? '').trim() || null,
  }
}

export async function addSupplier(
  _prev: SupplierState,
  formData: FormData
): Promise<SupplierState> {
  try {
    const { supabase } = await requireActionRole([...MANAGE_ROLES])
    const payload = parseForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อผู้จำหน่าย' }

    const { error } = await supabase.from('suppliers').insert(payload)
    if (error) return { error: error.message }

    revalidatePath('/purchasing/suppliers')
    revalidatePath('/purchasing')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateSupplier(
  _prev: SupplierState,
  formData: FormData
): Promise<SupplierState> {
  try {
    const { supabase } = await requireActionRole([...MANAGE_ROLES])
    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบผู้จำหน่าย' }

    const payload = parseForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อผู้จำหน่าย' }

    const { error } = await supabase.from('suppliers').update(payload).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/purchasing/suppliers')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  const { supabase } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้จำหน่าย')

  const { count } = await supabase
    .from('purchase_orders').select('id', { count: 'exact', head: true })
    .eq('supplier_id', id)

  if ((count ?? 0) > 0) {
    throw new Error('ไม่สามารถลบผู้จำหน่ายที่มีใบสั่งซื้อได้')
  }

  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/purchasing/suppliers')
}

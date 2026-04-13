'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { supplierRepo, type SupplierInput } from '@/lib/repositories/suppliers'

export type SupplierState = { error?: string; success?: boolean } | undefined

const MANAGE_ROLES = ['admin', 'manager', 'purchasing'] as const

function parseForm(formData: FormData): SupplierInput {
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

    const error = await supplierRepo.create(supabase, payload)
    if (error) return { error }

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

    const error = await supplierRepo.update(supabase, id, payload)
    if (error) return { error }

    revalidatePath('/purchasing/suppliers')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  const { supabase } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบผู้จำหน่าย')

  if (await supplierRepo.hasOrders(supabase, id)) {
    throw new Error('ไม่สามารถลบผู้จำหน่ายที่มีใบสั่งซื้อได้')
  }

  const error = await supplierRepo.delete(supabase, id)
  if (error) throw new Error(error)

  revalidatePath('/purchasing/suppliers')
}

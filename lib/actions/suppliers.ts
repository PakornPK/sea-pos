import { supplierRepo, type SupplierInput } from '@/lib/repositories'
import { parsePageParams, type Paginated } from '@/lib/pagination'
import type { Supplier } from '@/types/database'

export type SupplierPageData = Paginated<Supplier>

export async function listSuppliersPaginated(sp: { page?: string; pageSize?: string }): Promise<SupplierPageData> {
  const p = parsePageParams(sp)
  return supplierRepo.listPaginated(p)
}

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
    const payload = parseForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อผู้จำหน่าย' }

    const error = await supplierRepo.create(payload)
    if (error) return { error }

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
    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบผู้จำหน่าย' }

    const existing = await supplierRepo.getById(id)
    if (!existing) return { error: 'ไม่พบผู้จำหน่าย' }

    const payload = parseForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อผู้จำหน่าย' }

    const error = await supplierRepo.update(id, payload)
    if (error) return { error }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  if (!id) throw new Error('ไม่พบผู้จำหน่าย')

  const existing = await supplierRepo.getById(id)
  if (!existing) throw new Error('ไม่พบผู้จำหน่าย')

  if (await supplierRepo.hasOrders(id)) {
    throw new Error('ไม่สามารถลบผู้จำหน่ายที่มีใบสั่งซื้อได้')
  }

  const error = await supplierRepo.delete(id)
  if (error) throw new Error(error)
}

// Re-export for documentation purposes
export { MANAGE_ROLES }

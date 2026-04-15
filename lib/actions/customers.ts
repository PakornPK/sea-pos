'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { customerRepo, type CustomerInput } from '@/lib/repositories'

export type CustomerState = { error?: string; success?: boolean } | undefined

const CREATE_ROLES = ['admin', 'manager', 'cashier'] as const
const MANAGE_ROLES = ['admin', 'manager'] as const

function parseCustomerForm(formData: FormData): CustomerInput {
  return {
    name:    String(formData.get('name')    ?? '').trim(),
    phone:   String(formData.get('phone')   ?? '').trim() || null,
    email:   String(formData.get('email')   ?? '').trim() || null,
    address: String(formData.get('address') ?? '').trim() || null,
  }
}

export async function addCustomer(
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  try {
    const { me } = await requireActionRole([...CREATE_ROLES])
    const payload = parseCustomerForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const error = await customerRepo.create(payload)
    if (error) return { error }

    revalidatePath('/customers')
    if (me.companyId) revalidateTag(`customers:${me.companyId}`, {})
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateCustomer(
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบลูกค้า' }

    const payload = parseCustomerForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const error = await customerRepo.update(id, payload)
    if (error) return { error }

    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    if (me.companyId) revalidateTag(`customers:${me.companyId}`, {})
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const { me } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบลูกค้า')

  if (await customerRepo.hasSales(id)) {
    throw new Error('ไม่สามารถลบลูกค้าที่มีประวัติการขายได้')
  }

  const error = await customerRepo.delete(id)
  if (error) throw new Error(error)

  revalidatePath('/customers')
  if (me.companyId) revalidateTag(`customers:${me.companyId}`, {})
  redirect('/customers')
}

export async function quickCreateCustomer(
  name: string,
  phone: string | null
): Promise<{ id: string; name: string; phone: string | null } | { error: string }> {
  try {
    const { me } = await getActionUser()
    const trimmed = name.trim()
    if (!trimmed) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const res = await customerRepo.createReturning({
      name: trimmed,
      phone: phone?.trim() || null,
    })
    if ('error' in res) return res

    revalidatePath('/customers')
    if (me.companyId) revalidateTag(`customers:${me.companyId}`, {})
    return res
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

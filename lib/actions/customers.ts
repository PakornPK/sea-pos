'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser, requireActionRole } from '@/lib/auth'

export type CustomerState = { error?: string; success?: boolean } | undefined

const CREATE_ROLES = ['admin', 'manager', 'cashier'] as const
const MANAGE_ROLES = ['admin', 'manager'] as const

function parseCustomerForm(formData: FormData) {
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
    const { supabase } = await requireActionRole([...CREATE_ROLES])
    const payload = parseCustomerForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const { error } = await supabase.from('customers').insert(payload)
    if (error) return { error: error.message }

    revalidatePath('/customers')
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
    const { supabase } = await requireActionRole([...MANAGE_ROLES])

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบลูกค้า' }

    const payload = parseCustomerForm(formData)
    if (!payload.name) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const { error } = await supabase.from('customers').update(payload).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const { supabase } = await requireActionRole(['admin'])
  if (!id) throw new Error('ไม่พบลูกค้า')

  // Block delete if sales exist (preserve history)
  const { count } = await supabase
    .from('sales').select('id', { count: 'exact', head: true })
    .eq('customer_id', id)

  if ((count ?? 0) > 0) {
    throw new Error('ไม่สามารถลบลูกค้าที่มีประวัติการขายได้')
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/customers')
  redirect('/customers')
}

// Quick-create used by POS picker — returns the created customer so the
// client can select it immediately without a round trip to the DB.
export async function quickCreateCustomer(
  name: string,
  phone: string | null
): Promise<{ id: string; name: string; phone: string | null } | { error: string }> {
  try {
    const { supabase } = await getActionUser()
    const trimmed = name.trim()
    if (!trimmed) return { error: 'กรุณาระบุชื่อลูกค้า' }

    const { data, error } = await supabase
      .from('customers')
      .insert({ name: trimmed, phone: phone?.trim() || null })
      .select('id, name, phone')
      .single()

    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }

    revalidatePath('/customers')
    return { id: data.id, name: data.name, phone: data.phone }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

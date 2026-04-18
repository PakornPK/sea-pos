'use server'

import { getActionUser, requireActionRole } from '@/lib/auth'
import { optionRepo } from '@/lib/repositories'
import { revalidatePath } from 'next/cache'
import type { OptionGroupWithOptions } from '@/types/database'

/** Fetch option groups for a product (called from POS dialog). */
export async function getProductOptions(productId: string): Promise<OptionGroupWithOptions[]> {
  await getActionUser()
  return optionRepo.listForProduct(productId)
}

// ── Admin: manage option groups ───────────────────────────────────────────────

export type OptionGroupState = { error?: string } | undefined

export async function saveOptionGroup(
  _prev: OptionGroupState,
  formData: FormData,
): Promise<OptionGroupState> {
  try {
    const { me } = await requireActionRole(['admin', 'manager'])
    const productId   = formData.get('product_id')   as string
    const id          = (formData.get('id') as string) || undefined
    const name        = (formData.get('name') as string).trim()
    const required    = formData.get('required')    === 'true'
    const multiSelect = formData.get('multi_select') === 'true'
    const sortOrder   = Number(formData.get('sort_order') ?? 0)

    if (!name) return { error: 'กรุณาระบุชื่อกลุ่มตัวเลือก' }
    if (!me.companyId) return { error: 'ไม่พบบริษัท' }

    await optionRepo.saveGroup(productId, me.companyId, { id, name, required, multi_select: multiSelect, sort_order: sortOrder })
    revalidatePath(`/inventory/${productId}/edit`)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteOptionGroup(groupId: string, productId: string): Promise<void> {
  await requireActionRole(['admin', 'manager'])
  await optionRepo.deleteGroup(groupId)
  revalidatePath(`/inventory/${productId}/edit`)
}

export async function saveOption(
  _prev: OptionGroupState,
  formData: FormData,
): Promise<OptionGroupState> {
  try {
    await requireActionRole(['admin', 'manager'])
    const groupId         = formData.get('group_id')         as string
    const productId       = formData.get('product_id')       as string
    const id              = (formData.get('id') as string)   || undefined
    const name            = (formData.get('name') as string).trim()
    const priceDelta      = Number(formData.get('price_delta') ?? 0)
    const sortOrder       = Number(formData.get('sort_order') ?? 0)
    const linkedProductId = (formData.get('linked_product_id') as string) || null
    const quantityPerUse = parseFloat(formData.get('quantity_per_use') as string) || 1

    if (!name) return { error: 'กรุณาระบุชื่อตัวเลือก' }

    await optionRepo.saveOption(groupId, { id, name, price_delta: priceDelta, sort_order: sortOrder, linked_product_id: linkedProductId, quantity_per_use: quantityPerUse })
    revalidatePath(`/inventory/${productId}/edit`)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteOption(optionId: string, productId: string): Promise<void> {
  await requireActionRole(['admin', 'manager'])
  await optionRepo.deleteOption(optionId)
  revalidatePath(`/inventory/${productId}/edit`)
}

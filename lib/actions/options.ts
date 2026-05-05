import { optionRepo } from '@/lib/repositories'
import type { OptionGroupWithOptions } from '@/types/database'

/** Fetch option groups for a product (called from POS dialog). */
export async function getProductOptions(productId: string): Promise<OptionGroupWithOptions[]> {
  return optionRepo.listForProduct(productId)
}

// ── Admin: manage option groups ───────────────────────────────────────────────

export type OptionGroupState = { error?: string } | undefined

export async function saveOptionGroup(
  _prev: OptionGroupState,
  formData: FormData,
): Promise<OptionGroupState> {
  try {
    const productId   = formData.get('product_id')   as string
    const companyId   = (formData.get('company_id')  as string) || ''
    const id          = (formData.get('id') as string) || undefined
    const name        = (formData.get('name') as string).trim()
    const required    = formData.get('required')    === 'true'
    const multiSelect = formData.get('multi_select') === 'true'
    const sortOrder   = Number(formData.get('sort_order') ?? 0)

    if (!name) return { error: 'กรุณาระบุชื่อกลุ่มตัวเลือก' }

    await optionRepo.saveGroup(productId, companyId, { id, name, required, multi_select: multiSelect, sort_order: sortOrder })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteOptionGroup(groupId: string, productId: string): Promise<void> {
  await optionRepo.deleteGroup(groupId)
  void productId // kept for caller context
}

export async function saveOption(
  _prev: OptionGroupState,
  formData: FormData,
): Promise<OptionGroupState> {
  try {
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
    void productId // kept for caller context
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteOption(optionId: string, productId: string): Promise<void> {
  await optionRepo.deleteOption(optionId)
  void productId // kept for caller context
}

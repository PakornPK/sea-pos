'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { categoryRepo } from '@/lib/repositories'
import type { CategoryType } from '@/types/database'

export type CategoryState = { error: string } | undefined

const MANAGE_ROLES = ['admin', 'manager'] as const

function cleanPrefix(raw: string | null | undefined): string | null {
  return ((raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')) || null
}

export async function addCategory(
  _prev: CategoryState,
  formData: FormData
): Promise<CategoryState> {
  try {
    const { me } = await requireActionRole([...MANAGE_ROLES])
    const name = (formData.get('name') as string).trim()
    if (!name) return { error: 'กรุณาระบุชื่อหมวดหมู่' }

    const rawType = formData.get('category_type') as string | null
    const category_type: CategoryType =
      rawType === 'option' ? 'option' : rawType === 'both' ? 'both' : 'sale'

    const error = await categoryRepo.create({
      name,
      sku_prefix:    cleanPrefix(formData.get('sku_prefix') as string | null),
      vat_exempt:    formData.get('vat_exempt') === 'on',
      category_type,
    })
    if (error) return { error }

    revalidatePath('/inventory/categories')
    revalidatePath('/inventory')
    if (me.companyId) revalidateTag(`categories:${me.companyId}`, {})
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateCategoryPrefix(categoryId: string, prefix: string) {
  const { me } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updatePrefix(categoryId, cleanPrefix(prefix))
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  if (me.companyId) revalidateTag(`categories:${me.companyId}`, {})
}

export async function updateCategoryVatExempt(categoryId: string, vatExempt: boolean) {
  const { me } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updateVatExempt(categoryId, vatExempt)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
  if (me.companyId) revalidateTag(`categories:${me.companyId}`, {})
}

export async function updateCategoryType(categoryId: string, categoryType: CategoryType) {
  const { me } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updateCategoryType(categoryId, categoryType)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
  revalidatePath('/pos')
  if (me.companyId) revalidateTag(`categories:${me.companyId}`, {})
}

export async function deleteCategory(categoryId: string) {
  const { me } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.delete(categoryId)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
  if (me.companyId) revalidateTag(`categories:${me.companyId}`, {})
}

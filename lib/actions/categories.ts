'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import { categoryRepo } from '@/lib/repositories'

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
    await requireActionRole([...MANAGE_ROLES])
    const name = (formData.get('name') as string).trim()
    if (!name) return { error: 'กรุณาระบุชื่อหมวดหมู่' }

    const error = await categoryRepo.create({
      name,
      sku_prefix: cleanPrefix(formData.get('sku_prefix') as string | null),
      vat_exempt: formData.get('vat_exempt') === 'on',
    })
    if (error) return { error }

    revalidatePath('/inventory/categories')
    revalidatePath('/inventory')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateCategoryPrefix(categoryId: string, prefix: string) {
  await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updatePrefix(categoryId, cleanPrefix(prefix))
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
}

export async function updateCategoryVatExempt(categoryId: string, vatExempt: boolean) {
  await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updateVatExempt(categoryId, vatExempt)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
}

export async function deleteCategory(categoryId: string) {
  await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.delete(categoryId)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
}

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
    const { supabase } = await requireActionRole([...MANAGE_ROLES])
    const name = (formData.get('name') as string).trim()
    if (!name) return { error: 'กรุณาระบุชื่อหมวดหมู่' }

    const error = await categoryRepo.create(supabase, {
      name,
      sku_prefix: cleanPrefix(formData.get('sku_prefix') as string | null),
    })
    if (error) return { error }

    revalidatePath('/inventory/categories')
    revalidatePath('/inventory')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateCategoryPrefix(categoryId: string, prefix: string) {
  const { supabase } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.updatePrefix(supabase, categoryId, cleanPrefix(prefix))
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
}

export async function deleteCategory(categoryId: string) {
  const { supabase } = await requireActionRole([...MANAGE_ROLES])
  const error = await categoryRepo.delete(supabase, categoryId)
  if (error) throw new Error(error)
  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
}

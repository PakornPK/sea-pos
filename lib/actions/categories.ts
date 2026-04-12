'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CategoryState = { error: string } | undefined

export async function addCategory(
  prevState: CategoryState,
  formData: FormData
): Promise<CategoryState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'กรุณาระบุชื่อหมวดหมู่' }

  const { error } = await supabase.from('categories').insert({ name })
  if (error) return { error: error.message }

  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Products with this category will have category_id set to NULL (ON DELETE SET NULL)
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) throw new Error(error.message)

  revalidatePath('/inventory/categories')
  revalidatePath('/inventory')
}

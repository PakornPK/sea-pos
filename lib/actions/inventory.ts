'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function adjustStock(productId: string, delta: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single()

  if (fetchError || !product) throw new Error('Product not found')

  const newStock = product.stock + delta
  if (newStock < 0) return { error: 'สต๊อกไม่เพียงพอ' }

  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId)

  if (updateError) return { error: updateError.message }

  await supabase.from('stock_logs').insert({
    product_id: productId,
    change: delta,
    user_id: user.id,
  })

  revalidatePath('/inventory')
}

export async function addProduct(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = (formData.get('name') as string).trim()
  const sku = (formData.get('sku') as string | null)?.trim() ?? ''
  const minStock = parseInt(formData.get('min_stock') as string) || 0
  const price = parseFloat(formData.get('price') as string) || 0
  const cost = parseFloat(formData.get('cost') as string) || 0
  const categoryId = (formData.get('category_id') as string) || null

  if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

  const { error } = await supabase.from('products').insert({
    name,
    sku,
    min_stock: minStock,
    price,
    cost,
    category_id: categoryId,
    stock: 0,
  })

  if (error) return { error: error.message }

  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/inventory')
}

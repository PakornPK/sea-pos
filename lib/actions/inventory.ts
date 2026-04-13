'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser, requireActionRole } from '@/lib/auth'

const ADJUST_ROLES = ['admin', 'manager'] as const
const CREATE_ROLES = ['admin', 'manager', 'purchasing'] as const

export async function adjustStock(productId: string, delta: number) {
  try {
    const { supabase, me } = await requireActionRole([...ADJUST_ROLES])

    const { data: product, error: fetchError } = await supabase
      .from('products').select('stock').eq('id', productId).single()

    if (fetchError || !product) throw new Error('Product not found')

    const newStock = product.stock + delta
    if (newStock < 0) return { error: 'สต๊อกไม่เพียงพอ' }

    const { error: updateError } = await supabase
      .from('products').update({ stock: newStock }).eq('id', productId)

    if (updateError) return { error: updateError.message }

    await supabase.from('stock_logs').insert({
      product_id: productId,
      change: delta,
      reason: delta > 0 ? 'ปรับเพิ่มสต๊อก (ผู้จัดการ)' : 'ปรับลดสต๊อก (ผู้จัดการ)',
      user_id: me.id,
    })

    revalidatePath('/inventory')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ไม่มีสิทธิ์' }
  }
}

export async function addProduct(_prev: unknown, formData: FormData) {
  const { supabase } = await requireActionRole([...ADJUST_ROLES])

  const name = (formData.get('name') as string).trim()
  let sku = (formData.get('sku') as string | null)?.trim() ?? ''
  const minStock = parseInt(formData.get('min_stock') as string) || 0
  const price = parseFloat(formData.get('price') as string) || 0
  const cost = parseFloat(formData.get('cost') as string) || 0
  const categoryId = (formData.get('category_id') as string) || null

  if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

  if (!sku && categoryId) {
    const { data: generated } = await supabase
      .rpc('next_sku_for_category', { p_category_id: categoryId })
    if (generated) sku = generated as string
  }

  const { error } = await supabase.from('products').insert({
    name,
    sku: sku || null,
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

// Used by PO line editor to catalog a new SKU inline while drafting a PO.
// Returns the created product so the client can immediately add it as a line.
export async function quickCreateProduct(input: {
  name: string
  sku: string | null
  categoryId: string | null
  price: number
  cost: number
  minStock: number
}): Promise<
  | { id: string; name: string; sku: string | null; price: number; cost: number; category_id: string | null; stock: number; min_stock: number }
  | { error: string }
> {
  try {
    const { supabase, me } = await getActionUser()
    if (!(CREATE_ROLES as readonly string[]).includes(me.role)) {
      return { error: 'ไม่มีสิทธิ์เพิ่มสินค้า' }
    }

    const name = input.name.trim()
    if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

    let sku = input.sku?.trim() || null
    if (!sku && input.categoryId) {
      const { data: generated } = await supabase
        .rpc('next_sku_for_category', { p_category_id: input.categoryId })
      if (generated) sku = generated as string
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        sku,
        category_id: input.categoryId,
        price: Number.isFinite(input.price) ? input.price : 0,
        cost: Number.isFinite(input.cost) ? input.cost : 0,
        min_stock: Number.isFinite(input.minStock) ? input.minStock : 0,
        stock: 0,
      })
      .select('id, name, sku, price, cost, category_id, stock, min_stock')
      .single()

    if (error || !data) return { error: error?.message ?? 'บันทึกไม่สำเร็จ' }

    revalidatePath('/inventory')
    return {
      id: data.id,
      name: data.name,
      sku: data.sku,
      price: Number(data.price),
      cost: Number(data.cost),
      category_id: data.category_id,
      stock: data.stock,
      min_stock: data.min_stock,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteProduct(productId: string) {
  const { supabase } = await requireActionRole(['admin'])

  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) return { error: error.message }

  revalidatePath('/inventory')
}

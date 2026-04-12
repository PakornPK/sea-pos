'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SaleState = { error: string } | undefined
export type VoidState = { error?: string } | undefined

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

export async function createSale(prevState: SaleState, formData: FormData): Promise<SaleState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' }

  const cartJson = formData.get('cart') as string
  const paymentMethod = formData.get('paymentMethod') as string
  const customerId = (formData.get('customerId') as string) || null

  let cart: CartItem[]
  try {
    cart = JSON.parse(cartJson)
  } catch {
    return { error: 'ข้อมูลตะกร้าไม่ถูกต้อง' }
  }

  if (!cart.length) return { error: 'ไม่มีสินค้าในตะกร้า' }

  if (!['cash', 'card', 'transfer'].includes(paymentMethod)) {
    return { error: 'กรุณาเลือกวิธีชำระเงิน' }
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // ── Insert sale header ────────────────────────────────────────
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      customer_id: customerId,
      total_amount: totalAmount,
      payment_method: paymentMethod as 'cash' | 'card' | 'transfer',
      status: 'completed',
    })
    .select('id')
    .single()

  if (saleError || !sale) return { error: saleError?.message ?? 'ไม่สามารถบันทึกการขายได้' }

  // ── Insert line items ─────────────────────────────────────────
  const { error: itemsError } = await supabase.from('sale_items').insert(
    cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
    }))
  )

  if (itemsError) return { error: itemsError.message }

  // ── Decrement stock atomically via SECURITY DEFINER RPC ──────
  // Using RPC instead of direct UPDATE because:
  //   1. Cashier RLS blocks direct products UPDATE
  //   2. FOR UPDATE lock in the function prevents race conditions
  for (const item of cart) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_product_id: item.productId,
      p_quantity:   item.quantity,
      p_sale_id:    sale.id,
      p_user_id:    user.id,
    })

    if (stockError) {
      return { error: `อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${stockError.message}` }
    }
  }

  revalidatePath('/inventory')
  redirect(`/pos/receipt/${sale.id}`)
}

export async function voidSale(prevState: VoidState, formData: FormData): Promise<VoidState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' }

  // Only admin / manager may void
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return { error: 'ไม่มีสิทธิ์ยกเลิกออเดอร์' }
  }

  const saleId = formData.get('saleId') as string
  const reason = (formData.get('reason') as string | null)?.trim() ?? ''

  if (!saleId) return { error: 'ไม่พบรายการขาย' }
  if (!reason)  return { error: 'กรุณาระบุเหตุผลการยกเลิก' }

  // Fetch items before voiding so we can restore stock
  const { data: items } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .eq('sale_id', saleId)

  // Mark sale as voided (RLS: admin/manager only)
  const { error: voidError, data: voided } = await supabase
    .from('sales')
    .update({ status: 'voided' })
    .eq('id', saleId)
    .eq('status', 'completed') // prevent double-void
    .select('id')

  if (voidError) return { error: voidError.message }
  if (!voided?.length) return { error: 'ออเดอร์นี้ถูกยกเลิกแล้ว หรือไม่พบรายการ' }

  // Restore stock for every line item
  for (const item of items ?? []) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (!product) continue

    await supabase
      .from('products')
      .update({ stock: product.stock + item.quantity })
      .eq('id', item.product_id)

    await supabase.from('stock_logs').insert({
      product_id: item.product_id,
      change: item.quantity,
      reason: `ยกเลิกออเดอร์ #${saleId.slice(0, 8).toUpperCase()} — ${reason}`,
      user_id: user.id,
    })
  }

  revalidatePath('/inventory')
  revalidatePath(`/pos/receipt/${saleId}`)
}

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActionUser, requireActionRole } from '@/lib/auth'

export type SaleState = { error: string } | undefined
export type VoidState = { error?: string } | undefined

const SELL_ROLES = ['admin', 'manager', 'cashier'] as const
const VOID_ROLES = ['admin', 'manager'] as const

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

export async function createSale(_prev: SaleState, formData: FormData): Promise<SaleState> {
  const { supabase, me } = await getActionUser()
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) {
    return { error: 'ไม่มีสิทธิ์ขายสินค้า' }
  }

  const cartJson = formData.get('cart') as string
  const paymentMethod = formData.get('paymentMethod') as string
  const customerId = (formData.get('customerId') as string) || null

  let cart: CartItem[]
  try { cart = JSON.parse(cartJson) }
  catch { return { error: 'ข้อมูลตะกร้าไม่ถูกต้อง' } }

  if (!cart.length) return { error: 'ไม่มีสินค้าในตะกร้า' }
  if (!['cash', 'card', 'transfer'].includes(paymentMethod)) {
    return { error: 'กรุณาเลือกวิธีชำระเงิน' }
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // ── Insert sale header ────────────────────────────────────────
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      user_id: me.id,
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
  for (const item of cart) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_product_id: item.productId,
      p_quantity:   item.quantity,
      p_sale_id:    sale.id,
      p_user_id:    me.id,
    })

    if (stockError) {
      return { error: `อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${stockError.message}` }
    }
  }

  revalidatePath('/inventory')
  redirect(`/pos/receipt/${sale.id}`)
}

export async function voidSale(_prev: VoidState, formData: FormData): Promise<VoidState> {
  try {
    const { supabase, me } = await requireActionRole([...VOID_ROLES])

    const saleId = formData.get('saleId') as string
    const reason = (formData.get('reason') as string | null)?.trim() ?? ''

    if (!saleId) return { error: 'ไม่พบรายการขาย' }
    if (!reason) return { error: 'กรุณาระบุเหตุผลการยกเลิก' }

    const { data: items } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', saleId)

    const { error: voidError, data: voided } = await supabase
      .from('sales')
      .update({ status: 'voided' })
      .eq('id', saleId)
      .eq('status', 'completed')
      .select('id')

    if (voidError) return { error: voidError.message }
    if (!voided?.length) return { error: 'ออเดอร์นี้ถูกยกเลิกแล้ว หรือไม่พบรายการ' }

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
        user_id: me.id,
      })
    }

    revalidatePath('/inventory')
    revalidatePath(`/pos/receipt/${saleId}`)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

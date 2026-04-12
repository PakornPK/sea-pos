'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SaleState = { error: string } | undefined

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
      // Best-effort: sale is already committed, just surface the error
      return { error: `อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${stockError.message}` }
    }
  }

  revalidatePath('/inventory')
  redirect(`/pos/receipt/${sale.id}`)
}

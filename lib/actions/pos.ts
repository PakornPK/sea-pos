'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { productRepo, productStockRepo, saleRepo } from '@/lib/repositories'
import { DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/pagination'
import type { ProductWithStock } from '@/types/database'

export type SaleState = { error: string } | undefined
export type VoidState = { error?: string } | undefined

export async function searchInStockProducts(input: {
  page:   number
  search: string
}): Promise<Paginated<ProductWithStock>> {
  const { me } = await getActionUser()
  if (!me.activeBranchId) {
    return { rows: [], totalCount: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, totalPages: 1 }
  }
  return productRepo.listInStockForBranchPaginated(
    { page: Math.max(1, input.page), pageSize: DEFAULT_PAGE_SIZE },
    { branchId: me.activeBranchId, search: input.search },
  )
}

const SELL_ROLES = ['admin', 'manager', 'cashier'] as const
const VOID_ROLES = ['admin', 'manager'] as const

type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

export async function createSale(_prev: SaleState, formData: FormData): Promise<SaleState> {
  const { me } = await getActionUser()
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) {
    return { error: 'ไม่มีสิทธิ์ขายสินค้า' }
  }
  if (!me.activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

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

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const header = await saleRepo.createHeader({
    user_id: me.id,
    customer_id: customerId,
    branch_id: me.activeBranchId,
    total_amount: totalAmount,
    payment_method: paymentMethod as 'cash' | 'card' | 'transfer',
  })
  if ('error' in header) return { error: header.error }

  const itemsError = await saleRepo.insertItems(
    header.id,
    cart.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.price,
      subtotal: i.price * i.quantity,
    }))
  )
  if (itemsError) return { error: itemsError }

  for (const item of cart) {
    const stockErr = await productStockRepo.decrement({
      productId: item.productId,
      branchId:  me.activeBranchId,
      quantity:  item.quantity,
      saleId:    header.id,
      userId:    me.id,
    })
    if (stockErr) {
      return { error: `อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${stockErr}` }
    }
  }

  revalidatePath('/inventory')
  redirect(`/pos/receipt/${header.id}`)
}

export async function voidSale(_prev: VoidState, formData: FormData): Promise<VoidState> {
  try {
    const { me } = await requireActionRole([...VOID_ROLES])

    const saleId = formData.get('saleId') as string
    const reason = (formData.get('reason') as string | null)?.trim() ?? ''

    if (!saleId) return { error: 'ไม่พบรายการขาย' }
    if (!reason) return { error: 'กรุณาระบุเหตุผลการยกเลิก' }

    const sale = await saleRepo.getById(saleId)
    if (!sale) return { error: 'ไม่พบรายการขาย' }
    const saleBranchId = (sale as unknown as { branch_id?: string }).branch_id
    if (!saleBranchId) return { error: 'ไม่พบสาขาของรายการขายนี้' }

    const items = await saleRepo.listItems(saleId)

    const voidResult = await saleRepo.markVoided(saleId)
    if (typeof voidResult !== 'boolean') return { error: voidResult.error }
    if (!voidResult) return { error: 'ออเดอร์นี้ถูกยกเลิกแล้ว หรือไม่พบรายการ' }

    for (const item of items) {
      await productStockRepo.adjust({
        productId: item.product_id,
        branchId:  saleBranchId,
        delta:     item.quantity,
        reason:    `ยกเลิกออเดอร์ #${saleId.slice(0, 8).toUpperCase()} — ${reason}`,
        userId:    me.id,
      })
    }

    revalidatePath('/inventory')
    revalidatePath(`/pos/receipt/${saleId}`)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

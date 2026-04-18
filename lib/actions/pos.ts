'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { productRepo, productStockRepo, saleRepo, companyRepo, loyaltyRepo, optionRepo, productCostItemRepo } from '@/lib/repositories'
import { DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/pagination'
import type { ProductWithStock } from '@/types/database'
import { computeVat, getVatConfig } from '@/lib/vat'
import { chain, money, lineTotal, qty } from '@/lib/money'

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

/**
 * Scan lookup — resolves an exact barcode or SKU to an in-stock product at
 * the cashier's active branch. Barcode match takes precedence over SKU.
 * Returns null when nothing matches or the item is out of stock.
 */
export async function findProductByCode(code: string): Promise<ProductWithStock | null> {
  const { me } = await getActionUser()
  if (!me.activeBranchId) return null
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) return null
  return productRepo.findInStockByCodeForBranch(me.activeBranchId, code)
}

const SELL_ROLES = ['admin', 'manager', 'cashier'] as const
const VOID_ROLES = ['admin', 'manager'] as const

type CartOption = {
  group_id:          string
  group_name:        string
  option_id:         string
  option_name:       string
  price_delta:       number
  linked_product_id: string | null
  quantity_per_use:  number
}

type CartItem = {
  cartKey:   string
  productId: string
  name:      string
  price:     number
  quantity:  number
  vatExempt?: boolean
  trackStock?: boolean
  options:   CartOption[]
}

export async function createSale(_prev: SaleState, formData: FormData): Promise<SaleState> {
  const { me } = await getActionUser()
  if (!(SELL_ROLES as readonly string[]).includes(me.role)) {
    return { error: 'ไม่มีสิทธิ์ขายสินค้า' }
  }
  if (!me.activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

  const cartJson      = formData.get('cart')          as string
  const paymentMethod = formData.get('paymentMethod') as string
  const customerId    = (formData.get('customerId')   as string) || null
  const memberId      = (formData.get('memberId')     as string) || null
  const redeemPoints  = Number(formData.get('redeemPoints') ?? 0) || 0

  let cart: CartItem[]
  try { cart = JSON.parse(cartJson) }
  catch { return { error: 'ข้อมูลตะกร้าไม่ถูกต้อง' } }

  if (!cart.length) return { error: 'ไม่มีสินค้าในตะกร้า' }
  if (!['cash', 'card', 'transfer'].includes(paymentMethod)) {
    return { error: 'กรุณาเลือกวิธีชำระเงิน' }
  }

  // Re-resolve VAT config + per-item flags server-side. Never trust client
  // flags — a tampered payload could mis-state tax or skip stock checks.
  const company = me.companyId ? await companyRepo.getByIdCached(me.companyId) : null
  const vatConfig = getVatConfig(company)
  const companySettings = (company?.settings ?? {}) as { allow_negative_stock?: boolean }
  const allowNegative = companySettings.allow_negative_stock !== false  // default true
  const productIds = cart.map((i) => i.productId)
  // Include linked ingredient IDs so we can compute ingredient cost contribution
  const linkedIds = Array.from(new Set(
    cart.flatMap((i) => i.options.map((o) => o.linked_product_id).filter(Boolean) as string[])
  ))
  const allCostIds = Array.from(new Set([...productIds, ...linkedIds]))
  const [exemptMap, trackStockMap, costMap] = await Promise.all([
    productRepo.vatExemptMap(productIds),
    productRepo.trackStockMap(productIds),
    productRepo.costMap(allCostIds),
  ])
  const breakdown = computeVat(
    cart.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      vatExempt: Boolean(exemptMap[i.productId]),
    })),
    vatConfig,
  )

  // Member discount: convert redeemPoints → baht using membership settings
  let memberDiscountBaht = 0
  if (memberId && redeemPoints > 0) {
    const loyaltySettings = await loyaltyRepo.getSettings()
    if (loyaltySettings) {
      const maxDiscount = money(chain(breakdown.total).times(loyaltySettings.max_redeem_pct).div(100))
      const pointsValue = money(chain(redeemPoints).times(loyaltySettings.baht_per_point))
      memberDiscountBaht = Math.min(pointsValue, maxDiscount)
    }
  }
  const finalTotal = Math.max(0, money(chain(breakdown.total).minus(memberDiscountBaht)))

  const header = await saleRepo.createHeader({
    user_id:              me.id,
    customer_id:          customerId,
    member_id:            memberId,
    branch_id:            me.activeBranchId,
    total_amount:         finalTotal,
    subtotal_ex_vat:      breakdown.subtotalExVat,
    vat_amount:           breakdown.vatAmount,
    member_discount_baht: memberDiscountBaht,
    redeem_points_used:   redeemPoints,
    payment_method:       paymentMethod as 'cash' | 'card' | 'transfer',
  })
  if ('error' in header) return { error: header.error }

  const itemsResult = await saleRepo.insertItems(
    header.id,
    cart.map((i) => {
      // Base cost from the product itself (cup, packaging, etc.)
      const baseCost = chain(costMap[i.productId] ?? 0)
      // Add ingredient cost from each linked option (e.g. 20g beans × ฿0.80/g)
      const ingredientCost = (i.options ?? []).reduce((acc, o) => {
        if (!o.linked_product_id) return acc
        const ingCost = chain(costMap[o.linked_product_id] ?? 0)
        return acc.plus(ingCost.times(o.quantity_per_use ?? 1))
      }, chain(0))
      return {
        product_id:   i.productId,
        quantity:     i.quantity,
        unit_price:   i.price,
        subtotal:     lineTotal(i.price, i.quantity),
        cost_at_sale: money(baseCost.plus(ingredientCost)),
      }
    })
  )
  if ('error' in itemsResult) return { error: itemsResult.error }

  // Save selected options per sale item (snapshot includes linked_product_id)
  await Promise.all(
    cart.map((item, idx) => {
      if (!item.options?.length) return Promise.resolve()
      return optionRepo.insertSaleItemOptions(
        itemsResult.ids[idx],
        item.options.map((o) => ({
          option_id:         o.option_id,
          group_name:        o.group_name,
          option_name:       o.option_name,
          price_delta:       o.price_delta,
          linked_product_id: o.linked_product_id ?? null,
        }))
      )
    })
  )

  // Fetch BOM items for all products in cart (fixed ingredients always consumed)
  const bomItems = await productCostItemRepo.listForProducts(productIds)
  // Group by product_id for quick lookup
  const bomByProduct = new Map<string, typeof bomItems>()
  for (const b of bomItems) {
    if (!bomByProduct.has(b.product_id)) bomByProduct.set(b.product_id, [])
    bomByProduct.get(b.product_id)!.push(b)
  }

  // Deduct main product stock + linked option stock + linked BOM stock
  const linkedStockMap = new Map<string, number>()
  for (const item of cart) {
    if (trackStockMap[item.productId] !== false) {
      const stockErr = await productStockRepo.decrement({
        productId:     item.productId,
        branchId:      me.activeBranchId,
        quantity:      item.quantity,
        saleId:        header.id,
        userId:        me.id,
        allowNegative,
      })
      if (stockErr) return { error: `อัปเดตสต๊อก "${item.name}" ไม่สำเร็จ: ${stockErr}` }
    }
    // Accumulate linked option deductions (customer-chosen)
    for (const opt of item.options ?? []) {
      if (!opt.linked_product_id) continue
      const usage = qty(chain(opt.quantity_per_use ?? 1).times(item.quantity))
      linkedStockMap.set(
        opt.linked_product_id,
        qty(chain(linkedStockMap.get(opt.linked_product_id) ?? 0).plus(usage)),
      )
    }
    // Accumulate BOM linked deductions (fixed ingredients always consumed)
    for (const bom of bomByProduct.get(item.productId) ?? []) {
      if (!bom.linked_product_id) continue
      const usage = qty(chain(bom.quantity).times(item.quantity))
      linkedStockMap.set(
        bom.linked_product_id,
        qty(chain(linkedStockMap.get(bom.linked_product_id) ?? 0).plus(usage)),
      )
    }
  }
  // Resolve trackStock for all linked products and deduct
  if (linkedStockMap.size > 0) {
    const linkedIds = Array.from(linkedStockMap.keys())
    const linkedTrackMap = await productRepo.trackStockMap(linkedIds)
    for (const [linkedId, qty] of linkedStockMap) {
      if (linkedTrackMap[linkedId] === false) continue
      const linkedErr = await productStockRepo.decrement({
        productId:     linkedId,
        branchId:      me.activeBranchId,
        quantity:      qty,
        saleId:        header.id,
        userId:        me.id,
        allowNegative,
      })
      if (linkedErr) return { error: `อัปเดตสต๊อกส่วนประกอบ (${linkedId.slice(0, 8)}) ไม่สำเร็จ: ${linkedErr}` }
    }
  }

  // Award points / process redemption for member after stock is confirmed
  if (memberId) {
    await loyaltyRepo.awardPointsFromSale({
      member_id:     memberId,
      amount_baht:   finalTotal,
      sale_id:       header.id,
      redeem_points: redeemPoints,
    })
  }

  revalidatePath('/inventory')
  revalidatePath('/reports')
  revalidatePath('/dashboard')
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

    const voidNote = `ยกเลิกออเดอร์ #${saleId.slice(0, 8).toUpperCase()} — ${reason}`
    const [trackMap, linkedStock, bomItems] = await Promise.all([
      productRepo.trackStockMap(items.map((i) => i.product_id)),
      optionRepo.listLinkedStockForSale(saleId),
      productCostItemRepo.listForProducts(items.map((i) => i.product_id)),
    ])

    // Restore main product stock
    for (const item of items) {
      if (trackMap[item.product_id] === false) continue
      await productStockRepo.adjust({
        productId: item.product_id,
        branchId:  saleBranchId,
        delta:     item.quantity,
        reason:    voidNote,
        userId:    me.id,
      })
    }

    // Restore linked option stock
    if (linkedStock.length > 0) {
      const linkedTrackMap = await productRepo.trackStockMap(linkedStock.map((r) => r.linked_product_id))
      for (const { linked_product_id, total_quantity } of linkedStock) {
        if (linkedTrackMap[linked_product_id] === false) continue
        await productStockRepo.adjust({
          productId: linked_product_id,
          branchId:  saleBranchId,
          delta:     total_quantity,
          reason:    voidNote,
          userId:    me.id,
        })
      }
    }

    // Restore BOM linked stock (fixed ingredients)
    if (bomItems.length > 0) {
      // Accumulate total restore per linked product across all sale items
      const bomRestoreMap = new Map<string, number>()
      for (const item of items) {
        for (const bom of bomItems.filter((b) => b.product_id === item.product_id)) {
          if (!bom.linked_product_id) continue
          const usage = qty(chain(bom.quantity).times(item.quantity))
          bomRestoreMap.set(
            bom.linked_product_id,
            qty(chain(bomRestoreMap.get(bom.linked_product_id) ?? 0).plus(usage)),
          )
        }
      }
      const bomLinkedIds = Array.from(bomRestoreMap.keys())
      const bomTrackMap = await productRepo.trackStockMap(bomLinkedIds)
      for (const [linkedId, restoreQty] of bomRestoreMap) {
        if (bomTrackMap[linkedId] === false) continue
        await productStockRepo.adjust({
          productId: linkedId,
          branchId:  saleBranchId,
          delta:     restoreQty,
          reason:    voidNote,
          userId:    me.id,
        })
      }
    }

    revalidatePath('/inventory')
    revalidatePath(`/pos/receipt/${saleId}`)
    revalidatePath('/reports')
    revalidatePath('/dashboard')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

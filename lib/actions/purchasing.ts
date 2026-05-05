import { purchaseOrderRepo, productRepo, companyRepo, supplierRepo, categoryRepo, branchRepo, userRepo, type POLineInput } from '@/lib/repositories'
import type { Supplier, Product, Category, Branch } from '@/types/database'
import type { VatConfig } from '@/lib/vat'

export type NewPOFormData = {
  suppliers: Supplier[]
  products: Product[]
  categories: Category[]
  branches: Branch[]
  vatConfig: VatConfig
}

export async function getNewPOFormData(): Promise<NewPOFormData> {
  const [suppliers, products, categories, branches, company] = await Promise.all([
    supplierRepo.list(),
    productRepo.listAll(),
    categoryRepo.list(),
    branchRepo.list(),
    companyRepo.getCurrent(),
  ])
  return { suppliers, products, categories, branches, vatConfig: getVatConfig(company) }
}
import { computeVat, getVatConfig } from '@/lib/vat'
import { chain, qty } from '@/lib/money'

export type POState = { error?: string; success?: boolean; redirectTo?: string } | undefined

const MANAGE_ROLES = ['admin', 'manager', 'purchasing'] as const

type POLineFormInput = {
  productId: string
  quantity: number
  unitCost: number
}

function parseLines(raw: unknown): POLineFormInput[] {
  if (typeof raw !== 'string') return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((it: unknown) => {
        const obj = it as Record<string, unknown>
        return {
          productId: String(obj.productId ?? ''),
          quantity:  Number(obj.quantity  ?? 0),
          unitCost:  Number(obj.unitCost  ?? 0),
        }
      })
      .filter((l) => l.productId && l.quantity > 0)
  } catch {
    return []
  }
}

function toRepoLines(lines: POLineFormInput[]): POLineInput[] {
  return lines.map((l) => ({
    product_id:       l.productId,
    quantity_ordered: l.quantity,
    unit_cost:        l.unitCost,
  }))
}

/**
 * Compute the VAT breakdown for a PO. Resolves each product's effective VAT
 * exemption server-side (product.vat_exempt OR category.vat_exempt) so a
 * tampered client payload can't mis-state input VAT.
 */
async function computePoBreakdown(lines: POLineFormInput[]) {
  const [company, exemptMap] = await Promise.all([
    companyRepo.getCurrent(),
    productRepo.vatExemptMap(lines.map((l) => l.productId)),
  ])
  return computeVat(
    lines.map((l) => ({
      price:     l.unitCost,
      quantity:  l.quantity,
      vatExempt: Boolean(exemptMap[l.productId]),
    })),
    getVatConfig(company),
  )
}

export async function createPurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const userId       = (formData.get('userId')      as string) || ''
    const activeBranchId = (formData.get('activeBranchId') as string) || null
    const branchIds    = ((formData.get('branchIds') as string) || '').split(',').filter(Boolean)
    const isAdmin      = formData.get('isAdmin') === 'true'

    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))
    const rawBranch  = String(formData.get('branchId') ?? '').trim()

    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    // Branch: explicit picker wins (if supplied), else fall back to active branch.
    // Non-admins can only create POs at a branch they're assigned to.
    const branchId = rawBranch || activeBranchId
    if (!branchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }
    if (!isAdmin && !branchIds.includes(branchId)) {
      return { error: 'ไม่มีสิทธิ์สร้างใบสั่งซื้อที่สาขานี้' }
    }

    const breakdown = await computePoBreakdown(lines)

    const poResult = await purchaseOrderRepo.create({
      supplier_id:     supplierId,
      user_id:         userId,
      branch_id:       branchId,
      total_amount:    breakdown.total,
      subtotal_ex_vat: breakdown.subtotalExVat,
      vat_amount:      breakdown.vatAmount,
      notes,
      items:           toRepoLines(lines),
    })
    if ('error' in poResult) return { error: poResult.error }

    return { redirectTo: `/purchasing/detail/?id=${poResult.id}` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updatePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const id         = String(formData.get('id')         ?? '')
    const supplierId = String(formData.get('supplierId') ?? '')
    const notes      = String(formData.get('notes')      ?? '').trim() || null
    const lines      = parseLines(formData.get('lines'))

    if (!id)                return { error: 'ไม่พบใบสั่งซื้อ' }
    if (!supplierId)        return { error: 'กรุณาเลือกผู้จำหน่าย' }
    if (lines.length === 0) return { error: 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ' }

    const status = await purchaseOrderRepo.getStatus(id)
    if (!status) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (status !== 'draft') return { error: 'แก้ไขได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่างเท่านั้น' }

    const itemsErr = await purchaseOrderRepo.replaceItems(id, toRepoLines(lines))
    if (itemsErr) return { error: itemsErr }

    const breakdown = await computePoBreakdown(lines)
    const updateErr = await purchaseOrderRepo.updateHeader(id, {
      supplier_id:     supplierId,
      notes,
      total_amount:    breakdown.total,
      subtotal_ex_vat: breakdown.subtotalExVat,
      vat_amount:      breakdown.vatAmount,
    })
    if (updateErr) return { error: updateErr }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function confirmPurchaseOrder(id: string, userId = ''): Promise<void> {
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const status = await purchaseOrderRepo.getStatus(id)
  if (!status) throw new Error('ไม่พบใบสั่งซื้อ')
  if (status !== 'draft') throw new Error('ยืนยันได้เฉพาะใบสั่งซื้อที่เป็นฉบับร่างเท่านั้น')

  const err = await purchaseOrderRepo.confirm(id, userId)
  if (err) throw new Error(err)
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  if (!id) throw new Error('ไม่พบใบสั่งซื้อ')

  const status = await purchaseOrderRepo.getStatus(id)
  if (!status) throw new Error('ไม่พบใบสั่งซื้อ')
  if (status === 'received')  throw new Error('ใบสั่งซื้อที่รับของแล้วไม่สามารถยกเลิกได้')
  if (status === 'cancelled') throw new Error('ใบสั่งซื้อถูกยกเลิกแล้ว')

  const err = await purchaseOrderRepo.cancel(id)
  if (err) throw new Error(err)
}

export async function receivePurchaseOrder(
  _prev: POState,
  formData: FormData
): Promise<POState> {
  try {
    const userId = (formData.get('userId') as string) || ''

    const id = String(formData.get('id') ?? '')
    if (!id) return { error: 'ไม่พบใบสั่งซื้อ' }

    const receipts: { itemId: string; qty: number }[] = []
    for (const [key, val] of formData.entries()) {
      if (!key.startsWith('qty__')) continue
      const itemId = key.slice('qty__'.length)
      const qtyVal = Number(val)
      if (qtyVal > 0) receipts.push({ itemId, qty: qtyVal })
    }

    if (receipts.length === 0) return { error: 'กรุณาระบุจำนวนที่รับอย่างน้อย 1 รายการ' }

    const status = await purchaseOrderRepo.getStatus(id)
    if (!status) return { error: 'ไม่พบใบสั่งซื้อ' }
    if (status !== 'ordered') return { error: 'รับของได้เฉพาะใบสั่งซื้อสถานะ "สั่งซื้อแล้ว"' }

    // Build po_conversion map for this PO's items
    const allItems = await purchaseOrderRepo.listItemsWithProduct(id)
    const conversionMap = new Map(
      allItems.map((item) => {
        const product = item.product as { po_conversion?: number } | null
        return [item.id, product?.po_conversion ?? 1]
      })
    )

    for (const r of receipts) {
      const poConversion = conversionMap.get(r.itemId) ?? 1
      const err = await purchaseOrderRepo.receiveItem({
        itemId:   r.itemId,
        qty:      r.qty,
        stockQty: qty(chain(r.qty).times(poConversion)),
        userId,
      })
      if (err) return { error: `รับของไม่สำเร็จ: ${err}` }
    }

    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export type PODetailData = {
  po: Awaited<ReturnType<typeof purchaseOrderRepo.getById>>
  items: Awaited<ReturnType<typeof purchaseOrderRepo.listItemsWithProduct>>
  suppliers: Supplier[]
  products: Product[]
  categories: Category[]
  vatConfig: VatConfig
  branch: Branch | null
  signerOptions: Array<{ id: string; name: string | null; email: string }>
  lockedSignerName: string | null
}

function poUserName(u: { first_name: string | null; last_name: string | null; full_name: string | null }) {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.full_name || null
}

export async function getPODetail(id: string, companyId: string | null): Promise<PODetailData> {
  const [po, items, suppliers, products, categories, company] = await Promise.all([
    purchaseOrderRepo.getById(id),
    purchaseOrderRepo.listItemsWithProduct(id),
    supplierRepo.list(),
    productRepo.listAll(),
    categoryRepo.list(),
    companyRepo.getCurrent(),
  ])
  const vatConfig = getVatConfig(company)
  const [branch, companyUsers] = await Promise.all([
    po && (po as unknown as { branch_id?: string }).branch_id
      ? branchRepo.getById((po as unknown as { branch_id: string }).branch_id)
      : Promise.resolve(null),
    companyId ? userRepo.listByCompany(companyId) : Promise.resolve([]),
  ])

  // Auto-recalc VAT drift for drafts
  if (po && po.status === 'draft' && items.length > 0) {
    const exemptMap = await productRepo.vatExemptMap(items.map((i) => i.product_id))
    const expected = computeVat(
      items.map((i) => ({
        price:     Number(i.unit_cost),
        quantity:  i.quantity_ordered,
        vatExempt: Boolean(exemptMap[i.product_id]),
      })),
      vatConfig,
    )
    const drifted =
      Math.abs(expected.total         - Number(po.total_amount))    > 0.005 ||
      Math.abs(expected.subtotalExVat - Number(po.subtotal_ex_vat)) > 0.005 ||
      Math.abs(expected.vatAmount     - Number(po.vat_amount))      > 0.005
    if (drifted) {
      await purchaseOrderRepo.updateHeader(po.id, {
        supplier_id:     po.supplier_id,
        notes:           po.notes,
        total_amount:    expected.total,
        subtotal_ex_vat: expected.subtotalExVat,
        vat_amount:      expected.vatAmount,
      })
      po.total_amount    = expected.total
      po.subtotal_ex_vat = expected.subtotalExVat
      po.vat_amount      = expected.vatAmount
    }
  }

  const PURCHASING_ROLES = new Set(['admin', 'manager', 'purchasing'])
  const signerOptions = companyUsers
    .filter((u) => PURCHASING_ROLES.has(u.role) || (po && u.id === po.user_id))
    .map((u) => ({ id: u.id, name: poUserName(u), email: u.email }))

  const confirmedByUser = po?.confirmed_by_user_id
    ? companyUsers.find((u) => u.id === po.confirmed_by_user_id) ?? null
    : null
  const lockedSignerName = confirmedByUser ? poUserName(confirmedByUser) : null

  return { po, items, suppliers, products, categories, vatConfig, branch, signerOptions, lockedSignerName }
}

// Re-export for documentation purposes
export { MANAGE_ROLES }

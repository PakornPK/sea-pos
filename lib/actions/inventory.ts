'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { productRepo, productStockRepo, storageRepo, optionRepo } from '@/lib/repositories'
import { checkProductLimit, formatLimitError } from '@/lib/limits'
import { validateImageUpload, uniqueAssetName } from '@/lib/storage-validation'

const ADJUST_ROLES = ['admin', 'manager'] as const
const CREATE_ROLES = ['admin', 'manager', 'purchasing'] as const

export async function adjustStock(productId: string, delta: number) {
  try {
    const { me } = await requireActionRole([...ADJUST_ROLES])
    if (!me.activeBranchId) return { error: 'ไม่พบสาขาที่ใช้งาน' }

    const err = await productStockRepo.adjust({
      productId,
      branchId: me.activeBranchId,
      delta,
      reason: delta > 0 ? 'ปรับเพิ่มสต๊อก (ผู้จัดการ)' : 'ปรับลดสต๊อก (ผู้จัดการ)',
      userId: me.id,
    })
    if (err) return { error: err }

    revalidatePath('/inventory')
    revalidatePath('/pos')
    revalidatePath('/reports')
    revalidatePath('/dashboard')
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ไม่มีสิทธิ์' }
  }
}

export async function addProduct(_prev: unknown, formData: FormData) {
  const { me } = await requireActionRole([...ADJUST_ROLES])

  const name = (formData.get('name') as string).trim()
  let sku = (formData.get('sku') as string | null)?.trim() ?? ''
  const minStock = parseInt(formData.get('min_stock') as string) || 0
  const price = parseFloat(formData.get('price') as string) || 0
  const cost = parseFloat(formData.get('cost') as string) || 0
  const categoryId = (formData.get('category_id') as string) || null
  const vatExempt = formData.get('vat_exempt') === 'on'
  const trackStock = formData.get('track_stock') === 'on'  // checkbox: checked='on', unchecked=null
  const barcode = (formData.get('barcode') as string | null)?.trim() || null
  const rawImage = formData.get('image') as File | null
  const hasImage = !!rawImage && rawImage.size > 0

  if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

  let imageFile: File | null = null
  let imageExt: string | null = null
  if (hasImage) {
    const v = validateImageUpload(rawImage, 'product')
    if (!v.ok) return { error: v.error }
    imageFile = v.file
    imageExt = v.ext
  }

  const currentCount = await productRepo.countAll()
  const usage = await checkProductLimit(currentCount)
  if (usage?.reached) return { error: formatLimitError('product', usage) }

  if (!sku && categoryId) {
    const generated = await productRepo.nextSkuForCategory(categoryId)
    if (generated) sku = generated
  }

  const res = await productRepo.createReturning({
    name,
    sku: sku || null,
    min_stock: minStock,
    price,
    cost,
    category_id: categoryId,
    vat_exempt: vatExempt,
    barcode,
    track_stock: trackStock,
  })
  if ('error' in res) return { error: res.error }

  // Seed a pivot row at 0 for the user's current branch so tracked products
  // are queryable from the POS immediately. Untracked products (menu items /
  // services) don't need a stock row since they bypass the stock gate.
  if (me.activeBranchId && trackStock) {
    await productStockRepo.seed(res.id, me.activeBranchId)
  }

  if (imageFile && imageExt && me.companyId) {
    const relativePath = `${res.id}/${uniqueAssetName(imageExt)}`
    const upload = await storageRepo.upload(
      'products',
      me.companyId,
      relativePath,
      imageFile,
      { contentType: imageFile.type }
    )
    if (!('error' in upload) && upload.publicUrl) {
      await productRepo.updateImageUrl(res.id, upload.publicUrl)
    }
  }

  // Save option groups if provided (JSON encoded in form field)
  const optionGroupsRaw = formData.get('option_groups') as string | null
  if (optionGroupsRaw && me.companyId) {
    try {
      const groups = JSON.parse(optionGroupsRaw) as Array<{
        name: string
        required: boolean
        multi_select: boolean
        options: Array<{ name: string; price_delta: number }>
      }>
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi]
        const saved = await optionRepo.saveGroup(res.id, me.companyId, {
          name: g.name, required: g.required, multi_select: g.multi_select, sort_order: gi,
        })
        for (let oi = 0; oi < g.options.length; oi++) {
          const o = g.options[oi]
          await optionRepo.saveOption(saved.id, { name: o.name, price_delta: o.price_delta, sort_order: oi })
        }
      }
    } catch {
      // Malformed JSON — skip silently; product is already created
    }
  }

  revalidatePath('/inventory')
  revalidatePath('/pos')
  redirect('/inventory')
}

export async function quickCreateProduct(input: {
  name: string
  sku: string | null
  barcode?: string | null
  categoryId: string | null
  price: number
  cost: number
  minStock: number
}): Promise<
  | { id: string; name: string; sku: string | null; price: number; cost: number; category_id: string | null; stock: number; min_stock: number }
  | { error: string }
> {
  try {
    const { me } = await getActionUser()
    if (!(CREATE_ROLES as readonly string[]).includes(me.role)) {
      return { error: 'ไม่มีสิทธิ์เพิ่มสินค้า' }
    }

    const name = input.name.trim()
    if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

    const currentCount = await productRepo.countAll()
    const usage = await checkProductLimit(currentCount)
    if (usage?.reached) return { error: formatLimitError('product', usage) }

    let sku = input.sku?.trim() || null
    if (!sku && input.categoryId) {
      sku = await productRepo.nextSkuForCategory(input.categoryId)
    }

    const res = await productRepo.createReturning({
      name,
      sku,
      barcode: input.barcode?.trim() || null,
      category_id: input.categoryId,
      price: Number.isFinite(input.price) ? input.price : 0,
      cost: Number.isFinite(input.cost) ? input.cost : 0,
      min_stock: Number.isFinite(input.minStock) ? input.minStock : 0,
    })
    if ('error' in res) return res

    if (me.activeBranchId) {
      await productStockRepo.seed(res.id, me.activeBranchId)
    }

    revalidatePath('/inventory')
    revalidatePath('/pos')
    return {
      id: res.id,
      name: res.name,
      sku: res.sku ?? null,
      price: res.price,
      cost: res.cost,
      category_id: res.category_id,
      stock: 0,
      min_stock: res.min_stock,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

export async function updateProduct(productId: string, _prev: unknown, formData: FormData) {
  const { me } = await requireActionRole([...ADJUST_ROLES])

  const name = (formData.get('name') as string).trim()
  const sku = (formData.get('sku') as string | null)?.trim() ?? ''
  const minStock = parseInt(formData.get('min_stock') as string) || 0
  const price = parseFloat(formData.get('price') as string) || 0
  const cost = parseFloat(formData.get('cost') as string) || 0
  const categoryId = (formData.get('category_id') as string) || null
  const vatExempt = formData.get('vat_exempt') === 'on'
  const trackStock = formData.get('track_stock') === 'on'
  const barcode = (formData.get('barcode') as string | null)?.trim() || null

  if (!name) return { error: 'กรุณาระบุชื่อสินค้า' }

  const err = await productRepo.update(productId, {
    name,
    sku: sku || null,
    min_stock: minStock,
    price,
    cost,
    category_id: categoryId,
    vat_exempt: vatExempt,
    barcode,
    track_stock: trackStock,
  })
  if (err) return { error: err }

  // Ensure a stock row exists when track_stock is true. Idempotent — safe to
  // call even if the row already exists (ON CONFLICT DO NOTHING).
  if (trackStock && me.activeBranchId) {
    await productStockRepo.seed(productId, me.activeBranchId)
  }

  revalidatePath('/inventory')
  revalidatePath('/pos')
  redirect('/inventory')
}

export async function deleteProduct(productId: string) {
  await requireActionRole(['admin'])

  const error = await productRepo.delete(productId)
  if (error) return { error }

  revalidatePath('/inventory')
  revalidatePath('/pos')
}

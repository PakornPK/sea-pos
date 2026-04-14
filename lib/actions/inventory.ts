'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActionUser, requireActionRole } from '@/lib/auth'
import { productRepo, productStockRepo, storageRepo } from '@/lib/repositories'
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
  })
  if ('error' in res) return { error: res.error }

  // Seed a pivot row at 0 for the user's current branch so the product is
  // queryable from the POS immediately. Stock is raised via PO receive or
  // manual adjust.
  if (me.activeBranchId) {
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

  revalidatePath('/inventory')
  redirect('/inventory')
}

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

export async function deleteProduct(productId: string) {
  await requireActionRole(['admin'])

  const error = await productRepo.delete(productId)
  if (error) return { error }

  revalidatePath('/inventory')
}

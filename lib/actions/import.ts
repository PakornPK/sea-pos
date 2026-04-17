'use server'

import { revalidatePath } from 'next/cache'
import { requireActionRole } from '@/lib/auth'
import {
  productRepo,
  productStockRepo,
  customerRepo,
  loyaltyRepo,
  categoryRepo,
} from '@/lib/repositories'
import { normalizeKey } from '@/lib/csv'

export type ImportRow = Record<string, string>

export type RowError = {
  index: number
  error: string
}

export type ImportResult = {
  imported: number
  failed: RowError[]
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const { me } = await requireActionRole(['admin', 'manager', 'purchasing'])

  // Build category name → id map (case-insensitive).
  const categories = await categoryRepo.list()
  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  }

  let imported = 0
  const failed: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row['name']?.trim() ?? ''
      if (!name) {
        failed.push({ index: i, error: 'กรุณาระบุชื่อสินค้า' })
        continue
      }

      // Parse numeric fields — default to 0 on empty/missing.
      const parseNum = (val: string | undefined, label: string): number | { error: string } => {
        if (!val || val.trim() === '') return 0
        const n = Number(val.trim())
        if (!Number.isFinite(n) || n < 0) {
          return { error: `${label} ต้องเป็นตัวเลขที่ไม่ติดลบ` }
        }
        return n
      }

      const priceResult = parseNum(row['price'], 'ราคา')
      if (typeof priceResult === 'object') { failed.push({ index: i, error: priceResult.error }); continue }

      const costResult = parseNum(row['cost'], 'ต้นทุน')
      if (typeof costResult === 'object') { failed.push({ index: i, error: costResult.error }); continue }

      const minStockResult = parseNum(row['min_stock'], 'สต๊อกขั้นต่ำ')
      if (typeof minStockResult === 'object') { failed.push({ index: i, error: minStockResult.error }); continue }

      // track_stock defaults to true unless explicitly false/"0"/"no"
      const trackStockRaw = (row['track_stock'] ?? '').trim().toLowerCase()
      const trackStock = trackStockRaw === 'false' || trackStockRaw === '0' || trackStockRaw === 'no'
        ? false
        : true

      // Look up category by name
      const categoryName = (row['category'] ?? '').trim()
      const categoryId = categoryName
        ? (categoryMap.get(categoryName.toLowerCase()) ?? null)
        : null

      const sku = row['sku']?.trim() || null
      const barcode = row['barcode']?.trim() || null

      const result = await productRepo.create({
        name,
        sku,
        barcode,
        price: priceResult,
        cost: costResult,
        min_stock: Math.round(minStockResult),
        category_id: categoryId,
        track_stock: trackStock,
        vat_exempt: false,
        image_url: null,
      })

      if ('error' in result) {
        failed.push({ index: i, error: result.error })
        continue
      }

      // Seed stock row for this branch if track_stock is enabled.
      if (trackStock && me.activeBranchId) {
        await productStockRepo.seed(result.id, me.activeBranchId)
      }

      imported++
    } catch (e) {
      failed.push({
        index: i,
        error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
      })
    }
  }

  revalidatePath('/inventory')

  return { imported, failed }
}

// ─── Customers ───────────────────────────────────────────────────────────────

export async function importCustomers(rows: ImportRow[]): Promise<ImportResult> {
  await requireActionRole(['admin', 'manager', 'cashier'])

  let imported = 0
  const failed: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row['name']?.trim() ?? ''
      if (!name) {
        failed.push({ index: i, error: 'กรุณาระบุชื่อลูกค้า' })
        continue
      }

      const error = await customerRepo.create({
        name,
        phone: row['phone']?.trim() || null,
        email: row['email']?.trim() || null,
        address: row['address']?.trim() || null,
      })

      if (error) {
        failed.push({ index: i, error })
        continue
      }

      imported++
    } catch (e) {
      failed.push({
        index: i,
        error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
      })
    }
  }

  revalidatePath('/customers')

  return { imported, failed }
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function importMembers(rows: ImportRow[]): Promise<ImportResult> {
  await requireActionRole(['admin', 'manager'])

  let imported = 0
  const failed: RowError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const name = row['name']?.trim() ?? ''
      if (!name) {
        failed.push({ index: i, error: 'กรุณาระบุชื่อสมาชิก' })
        continue
      }

      const result = await loyaltyRepo.enrollMember({
        name,
        phone: row['phone']?.trim() || null,
        email: row['email']?.trim() || null,
        address: row['address']?.trim() || null,
      })

      if (!result) {
        failed.push({ index: i, error: 'ไม่สามารถสมัครสมาชิกได้' })
        continue
      }

      imported++
    } catch (e) {
      failed.push({
        index: i,
        error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
      })
    }
  }

  revalidatePath('/members')

  return { imported, failed }
}

// Re-export normalizeKey so the wizard can import it from here if needed.
export { normalizeKey }

import { storageRepo, productRepo, companyRepo } from '@/lib/repositories'
import type { StorageBucket } from '@/lib/repositories'
import { validateImageUpload, uniqueAssetName } from '@/lib/storage-validation'

export type UploadState = { url?: string; path?: string; error?: string } | undefined

// ─── Product image ───────────────────────────────────────────
export async function uploadProductImage(
  productId: string,
  companyId: string,
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  try {
    if (!companyId) return { error: 'ไม่พบข้อมูลบริษัทของคุณ' }

    const file = formData.get('file') as File | null
    const v = validateImageUpload(file, 'product')
    if (!v.ok) return { error: v.error }

    const relativePath = `${productId}/${uniqueAssetName(v.ext)}`

    const res = await storageRepo.upload(
      'products',
      companyId,
      relativePath,
      v.file,
      { contentType: v.file.type }
    )
    if ('error' in res) return { error: res.error }
    if (!res.publicUrl) return { error: 'ไม่สามารถสร้างลิงก์รูปได้' }

    // Write the URL onto the product row.
    await productRepo.updateImageUrl(productId, res.publicUrl)

    return { url: res.publicUrl, path: res.path }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' }
  }
}

export async function removeProductImage(productId: string): Promise<void> {
  // Best-effort: clear the column. The S3 object is left in place for now
  // (garbage collection via a nightly job is future work — see TODO.md).
  await productRepo.updateImageUrl(productId, null)
}

// ─── Company logo / receipt letterhead ───────────────────────
type CompanyAssetKind = 'logo' | 'letterhead'

export async function uploadCompanyAsset(
  kind: CompanyAssetKind,
  companyId: string,
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  try {
    if (!companyId) return { error: 'ไม่พบข้อมูลบริษัทของคุณ' }

    const file = formData.get('file') as File | null
    const v = validateImageUpload(file, 'logo')
    if (!v.ok) return { error: v.error }

    const relativePath = `${kind}/${uniqueAssetName(v.ext)}`

    const res = await storageRepo.upload(
      'company-assets',
      companyId,
      relativePath,
      v.file,
      { contentType: v.file.type }
    )
    if ('error' in res) return { error: res.error }
    if (!res.publicUrl) return { error: 'ไม่สามารถสร้างลิงก์รูปได้' }

    // Store the URL in companies.settings jsonb under `logo_url` / `letterhead_url`.
    const company = await companyRepo.getCurrent()
    const settings = (company?.settings ?? {}) as Record<string, unknown>
    const key = kind === 'logo' ? 'logo_url' : 'letterhead_url'
    await companyRepo.updateSettings(companyId, { ...settings, [key]: res.publicUrl })

    return { url: res.publicUrl, path: res.path }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' }
  }
}

export async function removeCompanyAsset(kind: CompanyAssetKind, companyId: string): Promise<void> {
  if (!companyId) return

  const company = await companyRepo.getCurrent()
  const settings = (company?.settings ?? {}) as Record<string, unknown>
  const key = kind === 'logo' ? 'logo_url' : 'letterhead_url'
  delete settings[key]
  await companyRepo.updateSettings(companyId, settings)
}

// ─── Generic helper: create a short-lived download URL ───────
// Used for receipts / imports / exports (private buckets).
export async function createDownloadUrl(
  bucket: StorageBucket,
  fullPath: string,
  expiresInSec = 300
): Promise<string | null> {
  return storageRepo.createSignedUrl(bucket, fullPath, expiresInSec)
}

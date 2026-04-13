import type {
  StorageBucket, StorageRepository, UploadResult,
} from '@/lib/repositories/contracts'
import { getDb } from './db'

/**
 * Build a tenant-scoped object path: "<companyId>/<subpath>".
 * Strips a leading "/" to avoid accidental "//" keys.
 */
function tenantPath(companyId: string, relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '')
  return `${companyId}/${clean}`
}

export const supabaseStorageRepo: StorageRepository = {
  async upload(bucket, companyId, relativePath, file, opts): Promise<UploadResult> {
    const db = await getDb()
    const path = tenantPath(companyId, relativePath)
    const contentType = opts?.contentType
    const upsert = opts?.upsert ?? true
    const { error } = await db.storage.from(bucket).upload(path, file as Blob, {
      contentType,
      upsert,
    })
    if (error) return { error: error.message }

    const publicUrl = bucket === 'products' || bucket === 'company-assets'
      ? db.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : null

    return { path, publicUrl }
  },

  /**
   * Synchronous URL builder for public buckets. Supabase's public URL is
   * deterministic: `{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}`.
   * We build it inline without going through the async getDb() client.
   */
  getPublicUrl(bucket: StorageBucket, fullPath: string): string | null {
    if (bucket !== 'products' && bucket !== 'company-assets') return null
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!base) return null
    return `${base}/storage/v1/object/public/${bucket}/${fullPath}`
  },

  async createSignedUrl(bucket, fullPath, expiresInSec = 3600) {
    const db = await getDb()
    const { data } = await db.storage.from(bucket).createSignedUrl(fullPath, expiresInSec)
    return data?.signedUrl ?? null
  },

  async remove(bucket, fullPath) {
    const db = await getDb()
    const { error } = await db.storage.from(bucket).remove([fullPath])
    return error?.message ?? null
  },

  async listByCompany(bucket, companyId, subpath = '') {
    const db = await getDb()
    const prefix = subpath ? `${companyId}/${subpath}` : companyId
    const { data } = await db.storage.from(bucket).list(prefix)
    return (data ?? []).map((o) => ({
      name: o.name,
      size: (o.metadata as { size?: number } | null)?.size ?? 0,
      created_at: o.created_at ?? null,
    }))
  },
}

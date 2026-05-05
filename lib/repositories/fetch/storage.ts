import type { StorageBucket, StorageRepository, UploadResult } from '@/lib/repositories/contracts'
import { readCookie } from '@/lib/cookies'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!

function storageHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = readCookie('pos_token')
  return { Authorization: `Bearer ${token}`, ...extra }
}

function tenantPath(companyId: string, relativePath: string): string {
  return `${companyId}/${relativePath.replace(/^\/+/, '')}`
}

export const fetchStorageRepo: StorageRepository = {
  async upload(bucket, companyId, relativePath, file, opts): Promise<UploadResult> {
    const path = tenantPath(companyId, relativePath)
    const headers = storageHeaders({ 'Content-Type': opts?.contentType ?? 'application/octet-stream' })
    if (opts?.upsert ?? true) headers['x-upsert'] = 'true'

    const res = await fetch(`${BASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers,
      body: file as Blob,
    })
    if (!res.ok) {
      if (res.status >= 500) return { error: 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
      const body = await res.json().catch(() => ({} as { error?: string })) as { error?: string }
      return { error: body.error ?? 'อัปโหลดไม่สำเร็จ' }
    }

    const publicUrl = (bucket === 'products' || bucket === 'company-assets')
      ? `${BASE_URL}/storage/v1/object/public/${bucket}/${path}`
      : null
    return { path, publicUrl }
  },

  getPublicUrl(bucket: StorageBucket, fullPath: string): string | null {
    if (bucket !== 'products' && bucket !== 'company-assets') return null
    if (!BASE_URL) return null
    return `${BASE_URL}/storage/v1/object/public/${bucket}/${fullPath}`
  },

  async createSignedUrl(bucket, fullPath, expiresInSec = 3600): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/storage/v1/object/sign/${bucket}/${fullPath}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: expiresInSec }),
    })
    if (!res.ok) return null
    const { signedURL } = await res.json() as { signedURL?: string }
    if (!signedURL) return null
    return signedURL.startsWith('http') ? signedURL : `${BASE_URL}${signedURL}`
  },

  async remove(bucket, fullPath): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: storageHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: [fullPath] }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: string })) as { error?: string }
      return body.error ?? 'Delete failed'
    }
    return null
  },

  async listByCompany(bucket, companyId, subpath = '') {
    const prefix = subpath ? `${companyId}/${subpath}` : companyId
    const res = await fetch(`${BASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefix, limit: 100, offset: 0 }),
    })
    if (!res.ok) return []
    const data = await res.json() as Array<{
      name: string
      metadata?: { size?: number }
      created_at?: string
    }>
    return data.map((o) => ({
      name: o.name,
      size: o.metadata?.size ?? 0,
      created_at: o.created_at ?? null,
    }))
  },
}

/**
 * StorageRepository — abstracts object storage operations.
 *
 * Every method is tenant-aware: the caller passes `companyId` explicitly,
 * and the implementation builds paths of the form `{companyId}/{subpath}`.
 * The storage backend's RLS enforces that only this tenant (or platform
 * admin) can read/write under that prefix — defence in depth.
 *
 * The five buckets map to concrete use cases:
 *   - `products`       (public)  — product catalog images
 *   - `company-assets` (public)  — logo, receipt letterhead
 *   - `receipts`       (private) — scanned/signed receipt attachments
 *   - `imports`        (private) — CSV/XLSX uploads being processed
 *   - `exports`        (private) — scheduled backup exports
 */

export type StorageBucket =
  | 'products'
  | 'company-assets'
  | 'receipts'
  | 'imports'
  | 'exports'

export type UploadResult =
  | { path: string; publicUrl: string | null }
  | { error: string }

export interface StorageRepository {
  /**
   * Upload a file. `path` is relative — the implementation prepends
   * `{companyId}/` automatically to enforce tenant scoping.
   */
  upload(
    bucket: StorageBucket,
    companyId: string,
    relativePath: string,
    file: Blob | File | ArrayBuffer | Uint8Array,
    opts?: { contentType?: string; upsert?: boolean }
  ): Promise<UploadResult>

  /**
   * For public buckets (products, company-assets) — returns a CDN URL that
   * works without authentication. Returns null for private buckets; use
   * `createSignedUrl` there.
   */
  getPublicUrl(bucket: StorageBucket, fullPath: string): string | null

  /**
   * Generate a short-lived URL for a private bucket object.
   * `expiresInSec` defaults to 60 minutes.
   */
  createSignedUrl(
    bucket: StorageBucket,
    fullPath: string,
    expiresInSec?: number
  ): Promise<string | null>

  /** Remove an object. Returns error message or null on success. */
  remove(bucket: StorageBucket, fullPath: string): Promise<string | null>

  /**
   * List objects under a company's prefix in the given bucket.
   * Used for file-browser style UI; not required for the core flows.
   */
  listByCompany(
    bucket: StorageBucket,
    companyId: string,
    subpath?: string
  ): Promise<Array<{ name: string; size: number; created_at: string | null }>>
}

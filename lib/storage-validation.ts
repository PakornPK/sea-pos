export type ImageKind = 'product' | 'logo'

const PRODUCT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

const PRODUCT_MAX = 5 * 1024 * 1024
const LOGO_MAX = 2 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/jpeg':    'jpg',
  'image/png':     'png',
  'image/webp':    'webp',
  'image/svg+xml': 'svg',
}

export function validateImageUpload(
  file: File | null,
  kind: ImageKind
): { ok: true; ext: string; file: File } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: 'กรุณาเลือกไฟล์รูป' }

  const allowed = kind === 'logo' ? LOGO_TYPES : PRODUCT_TYPES
  const max = kind === 'logo' ? LOGO_MAX : PRODUCT_MAX
  const maxLabel = kind === 'logo' ? '2 MB' : '5 MB'
  const typeLabel = kind === 'logo' ? 'JPG / PNG / WebP / SVG' : 'JPG / PNG / WebP'

  if (!allowed.includes(file.type)) {
    return { ok: false, error: `รองรับเฉพาะ ${typeLabel}` }
  }
  if (file.size > max) {
    return { ok: false, error: `ขนาดไฟล์ต้องไม่เกิน ${maxLabel}` }
  }
  return { ok: true, ext: EXT[file.type] ?? 'bin', file }
}

export function uniqueAssetName(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

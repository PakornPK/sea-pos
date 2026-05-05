import type { PageParams, Paginated } from '@/lib/pagination'
import { packPaginated } from '@/lib/pagination'
import { refreshAccessToken, readCookie } from '@/lib/cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getToken(): Promise<string> {
  return readCookie('pos_token')
}

function makeHeaders(token: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey:         API_KEY,
    Authorization:  `Bearer ${token}`,
    Accept:         'application/json',
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function refreshToken(): Promise<string> {
  return refreshAccessToken()
}

function buildQs(params: Record<string, string | string[]>): string {
  return Object.entries(params)
    .flatMap(([k, v]) => Array.isArray(v) ? v.map((vi) => `${k}=${vi}`) : [`${k}=${v}`])
    .join('&')
}

function parseContentRange(header: string | null): number {
  if (!header) return 0
  // Format: "0-19/150" or "*/150" or "*/*"
  const m = header.match(/\/(\d+)$/)
  return m ? Number(m[1]) : 0
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function restGet<T = unknown>(
  table: string,
  params: Record<string, string | string[]> = {},
): Promise<T> {
  const token = await getToken()
  const qs = buildQs(params)
  const fetchUrl = `${API_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`
  let res = await fetch(fetchUrl, { headers: makeHeaders(token) })

  if (res.status === 401) {
    const fresh = await refreshToken()
    if (fresh) res = await fetch(fetchUrl, { headers: makeHeaders(fresh) })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[restGet] ${table} → ${res.status} ${res.statusText}${body ? ': ' + body : ''}`)
  }
  return res.json() as Promise<T>
}

export async function restGetPaginated<T = unknown>(
  table: string,
  p: PageParams,
  params: Record<string, string | string[]> = {},
): Promise<Paginated<T>> {
  const token = await getToken()
  const offset = (p.page - 1) * p.pageSize
  const merged = { ...params, limit: String(p.pageSize), offset: String(offset) }
  const qs = buildQs(merged)
  const fetchUrl = `${API_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`
  let res = await fetch(fetchUrl, {
    headers: makeHeaders(token, { Prefer: 'count=exact' }),
  })

  if (res.status === 401) {
    const fresh = await refreshToken()
    if (fresh) res = await fetch(fetchUrl, { headers: makeHeaders(fresh, { Prefer: 'count=exact' }) })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[restGetPaginated] ${table} → ${res.status} ${res.statusText}${body ? ': ' + body : ''}`)
  }

  const totalCount = parseContentRange(res.headers.get('Content-Range'))
  const data = await res.json() as T[]
  return packPaginated(data, totalCount, p)
}

/** Server-side variant: accepts an explicit bearer token. Use in Route Handlers. */
export async function restGetWithToken<T = unknown>(
  token: string,
  table: string,
  params: Record<string, string | string[]> = {},
): Promise<T> {
  const qs = buildQs(params)
  const fetchUrl = `${API_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`
  const res = await fetch(fetchUrl, { headers: makeHeaders(token) })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[restGet] ${table} → ${res.status} ${res.statusText}${body ? ': ' + body : ''}`)
  }
  return res.json() as Promise<T>
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function restPost<T = unknown>(
  table: string,
  body: unknown,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...makeHeaders(token), Prefer: 'return=representation' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restPost] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  return res.json() as Promise<T>
}

export async function restPostWithToken<T = unknown>(
  token: string,
  table: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...makeHeaders(token), Prefer: 'return=representation' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restPost] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  return res.json() as Promise<T>
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function restPatch<T = unknown>(
  table: string,
  match: Record<string, string>,
  body: unknown,
): Promise<T[]> {
  const token = await getToken()
  const qs = buildQs(match)
  const res = await fetch(`${API_URL}/rest/v1/${table}?${qs}`, {
    method:  'PATCH',
    headers: { ...makeHeaders(token), Prefer: 'return=representation' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restPatch] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T[] : []
}

export async function restPatchWithToken<T = unknown>(
  token: string,
  table: string,
  match: Record<string, string>,
  body: unknown,
): Promise<T[]> {
  const qs = buildQs(match)
  const res = await fetch(`${API_URL}/rest/v1/${table}?${qs}`, {
    method:  'PATCH',
    headers: { ...makeHeaders(token), Prefer: 'return=representation' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restPatch] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T[] : []
}

export async function restPatchById<T = unknown>(
  table: string,
  id: string,
  body: unknown,
): Promise<T | null> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/rest/v1/${table}/${id}`, {
    method:  'PATCH',
    headers: { ...makeHeaders(token), Prefer: 'return=representation' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restPatchById] ${table}/${id} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : null
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function restDelete(
  table: string,
  match: Record<string, string>,
): Promise<void> {
  const token = await getToken()
  const qs = buildQs(match)
  const res = await fetch(`${API_URL}/rest/v1/${table}?${qs}`, {
    method:  'DELETE',
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restDelete] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
}

export async function restDeleteById(
  table: string,
  id: string,
): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/rest/v1/${table}/${id}`, {
    method:  'DELETE',
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restDeleteById] ${table}/${id} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
}

export async function restDeleteWithToken(
  token: string,
  table: string,
  match: Record<string, string>,
): Promise<void> {
  const qs = buildQs(match)
  const res = await fetch(`${API_URL}/rest/v1/${table}?${qs}`, {
    method:  'DELETE',
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restDelete] ${table} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
}

// ─── RPC ─────────────────────────────────────────────────────────────────────

export async function restRpc<T = unknown>(
  rpcName: string,
  body: unknown = {},
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/rest/v1/rpc/${rpcName}`, {
    method:  'POST',
    headers: makeHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restRpc] ${rpcName} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : (null as T)
}

// ─── AUTH endpoints (/auth/v1/*) ─────────────────────────────────────────────

export async function restAuthGet<T = unknown>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = await getToken()
  const qs = buildQs(params)
  const fetchUrl = `${API_URL}/auth/v1/${path}${qs ? '?' + qs : ''}`
  let res = await fetch(fetchUrl, { headers: makeHeaders(token) })

  if (res.status === 401) {
    const fresh = await refreshToken()
    if (fresh) res = await fetch(fetchUrl, { headers: makeHeaders(fresh) })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[restAuthGet] ${path} → ${res.status} ${res.statusText}${body ? ': ' + body : ''}`)
  }
  return res.json() as Promise<T>
}

export async function restAuthPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'POST',
    headers: makeHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAuthPost] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : (null as T)
}

export async function restAuthPut<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'PUT',
    headers: makeHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAuthPut] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : (null as T)
}

export async function restAuthDelete(path: string): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'DELETE',
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAuthDelete] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
}

// ─── Admin auth endpoints (/auth/v1/admin/*) ─────────────────────────────────
// Backend enforces role-based access via JWT claims — no service role key needed.

export async function restAdminAuthGet<T = unknown>(path: string): Promise<T> {
  const token = await getToken()
  let res = await fetch(`${API_URL}/auth/v1/${path}`, { headers: makeHeaders(token) })
  if (res.status === 401) {
    const fresh = await refreshToken()
    if (fresh) res = await fetch(`${API_URL}/auth/v1/${path}`, { headers: makeHeaders(fresh) })
  }
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAdminAuthGet] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  return res.json() as Promise<T>
}

export async function restAdminAuthPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'POST',
    headers: makeHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAdminAuthPost] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : (null as T)
}

export async function restAdminAuthPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'PUT',
    headers: makeHeaders(token),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAdminAuthPut] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) as T : (null as T)
}

export async function restAdminAuthDelete(path: string): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${API_URL}/auth/v1/${path}`, {
    method:  'DELETE',
    headers: makeHeaders(token),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`[restAdminAuthDelete] ${path} → ${res.status} ${res.statusText}${b ? ': ' + b : ''}`)
  }
}

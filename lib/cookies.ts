export function readCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

export function writeCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  const age = maxAge !== undefined ? `; Max-Age=${maxAge}` : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}${age}`
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0`
}

export async function refreshAccessToken(): Promise<string> {
  const refresh = readCookie('pos_refresh')
  if (!refresh) return ''
  const API_URL = process.env.NEXT_PUBLIC_API_URL!
  const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const res = await fetch(`${API_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) return ''
  const data = await res.json() as { access_token: string; refresh_token: string }
  writeCookie('pos_token', data.access_token)
  writeCookie('pos_refresh', data.refresh_token)
  return data.access_token
}

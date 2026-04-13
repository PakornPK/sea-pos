import type { CookieOptions } from '@supabase/ssr'

/**
 * Hardened defaults for every auth cookie Supabase writes (access token,
 * refresh token, PKCE verifier). We enforce:
 *   - httpOnly:  JS cannot read the cookie → blocks XSS token theft
 *   - secure:    HTTPS-only in production → blocks MITM on the wire
 *   - sameSite:  'lax' → blocks CSRF on cross-site POSTs while still
 *                allowing normal top-level navigation to work
 *   - path: '/' → cookie valid for the whole app
 *
 * Supabase's defaults are already httpOnly, but being explicit ensures
 * the guarantees survive library upgrades and are visible in code review.
 */
export function hardenCookieOptions(options: CookieOptions | undefined): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: options?.path ?? '/',
  }
}

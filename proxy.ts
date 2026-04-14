import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hardenCookieOptions } from '@/lib/supabase/cookie-options'

/**
 * ─── Security model ─────────────────────────────────────────────────────────
 * proxy.ts is the ONLY place that validates the Supabase session on every
 * request. It is the trust anchor of the whole application.
 *
 * After validation, it injects two request headers for downstream handlers:
 *   - x-sea-user-id    : authenticated user UUID
 *   - x-sea-user-email : authenticated user email (optional)
 *
 * Defense-in-depth:
 *   - Any incoming x-sea-* header from the client is STRIPPED before we
 *     validate — so a malicious client cannot impersonate another user by
 *     setting these headers themselves.
 *   - The headers live on the *internal server-side request* flowing from
 *     proxy → page handler. They are NOT visible to the browser.
 *   - Pages and Server Actions trust these headers; they do NOT call
 *     supabase.auth.getUser() again (which would be a second network round-
 *     trip per request). See lib/auth.ts for the read path.
 * ────────────────────────────────────────────────────────────────────────────
 */

const INTERNAL_HEADER_PREFIX = 'x-sea-'

function stripInternalHeaders(headers: Headers): Headers {
  const clean = new Headers(headers)
  for (const key of Array.from(clean.keys())) {
    if (key.toLowerCase().startsWith(INTERNAL_HEADER_PREFIX)) clean.delete(key)
  }
  return clean
}

export async function proxy(request: NextRequest) {
  // 1. Strip any client-forged x-sea-* headers BEFORE we do anything else.
  const requestHeaders = stripInternalHeaders(request.headers)

  // 2. Buffer cookies Supabase wants to set during session refresh.
  //    We'll apply them to the final response below.
  const cookiesToWrite: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            cookiesToWrite.push({ name, value, options: hardenCookieOptions(options) })
          })
        },
      },
    }
  )

  // 3. Validate with Supabase — source of truth. Never use getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isPublicAsset =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  // 4. Auth routing.
  if (!isPublicAsset) {
    if (!user && !isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const res = NextResponse.redirect(url)
      cookiesToWrite.forEach((c) => res.cookies.set(c.name, c.value, c.options))
      return res
    }
    if (user && isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      const res = NextResponse.redirect(url)
      cookiesToWrite.forEach((c) => res.cookies.set(c.name, c.value, c.options))
      return res
    }
  }

  // 5. Inject validated user identity into the request headers passed to the
  //    downstream page/action. Safe: we stripped any client-supplied versions
  //    in step 1, so nothing here was forgeable.
  if (user) {
    requestHeaders.set('x-sea-user-id', user.id)
    if (user.email) requestHeaders.set('x-sea-user-email', user.email)

    // Active branch cookie — set by the header picker. lib/auth.ts validates
    // this value against user_branches so a stale cookie can't leak access.
    const branchCookie = request.cookies.get('sea-branch')?.value
    if (branchCookie) requestHeaders.set('x-sea-branch', branchCookie)
  }

  // 6. Build the final response with the enriched request headers, and apply
  //    every cookie update Supabase queued during getUser().
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  cookiesToWrite.forEach((c) => response.cookies.set(c.name, c.value, c.options))
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

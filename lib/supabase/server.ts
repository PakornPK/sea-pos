import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { hardenCookieOptions } from './cookie-options'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, hardenCookieOptions(options))
            )
          } catch {
            // setAll called from a Server Component — cookies cannot be set.
            // Safe to ignore; proxy.ts will refresh the session on the next request.
          }
        },
      },
    }
  )
}

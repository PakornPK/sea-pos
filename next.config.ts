import type { NextConfig } from "next"

// Pull the Supabase public host out of the URL so next/image whitelists it.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseHost = (() => {
  try { return new URL(supabaseUrl).hostname } catch { return '' }
})()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
}

export default nextConfig

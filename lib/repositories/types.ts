import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * The type of every Supabase client in this project.
 * Both `createClient()` (server) and `createAdminClient()` (service role)
 * return a plain SupabaseClient. Repositories accept this as their first arg
 * so callers decide which client to use.
 */
export type DB = SupabaseClient

/**
 * Common result wrapper for mutations that can fail.
 * Success returns data; failure returns a user-visible error string.
 */
export type Result<T> = { data: T } | { error: string }

export function ok<T>(data: T): Result<T> {
  return { data }
}

export function err<T = never>(message: string): Result<T> {
  return { error: message }
}

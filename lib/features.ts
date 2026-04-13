/**
 * Centralized feature flags. Flip these to unlock capabilities without
 * code changes. All booleans read from public env so both server and
 * client can check them.
 *
 * Current flags:
 *   - ENABLE_SIGNUP — show /signup page + link on login form
 */

export const features = {
  /** Allow anyone to create a new company from /signup. */
  enableSignup: process.env.NEXT_PUBLIC_ENABLE_SIGNUP === 'true',
} as const

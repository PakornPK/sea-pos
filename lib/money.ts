/**
 * Decimal-safe money arithmetic for SEA-POS.
 *
 * Every monetary calculation in the app MUST go through this module instead of
 * using raw `+`, `-`, `*`, `/` on `number`. JavaScript uses IEEE-754 binary
 * floats, so naive expressions like `0.1 + 0.2` yield `0.30000000000000004`,
 * and `2.39 * 3` yields `7.170000000000001`. For a POS that ultimately stores
 * NUMERIC(12,2) and prints receipts to customers, those drifts compound and
 * turn into mis-billing, mis-reporting, or audit-trail mismatch.
 *
 * We use decimal.js with a 2-decimal-place banker... err, ROUND_HALF_UP policy
 * (matches ภ.พ.30 / Thai receipt conventions: 1.005 → 1.01). All persisted and
 * displayed amounts are rounded at the boundary to 2dp; intermediate math is
 * exact.
 */

import Decimal from 'decimal.js'

// Use ROUND_HALF_UP globally; 2dp is the Thai baht default.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP })

/** Displayed/persisted precision for baht. Satang is 0.01. */
export const MONEY_DP = 2

/** Accept anything a caller might reasonably throw at us. */
export type MoneyInput = Decimal | number | string | null | undefined

function d(x: MoneyInput): Decimal {
  if (x === null || x === undefined || x === '') return new Decimal(0)
  if (x instanceof Decimal) return x
  // Decimal.js accepts both numbers and strings. Passing a string avoids the
  // IEEE-754 round-trip when the value originated as text (Supabase NUMERIC
  // columns come back as either string or number depending on driver).
  return new Decimal(x)
}

/** Round to 2dp at the boundary and return a JS number ready for display / DB. */
export function money(x: MoneyInput): number {
  return d(x).toDecimalPlaces(MONEY_DP, Decimal.ROUND_HALF_UP).toNumber()
}

/** Same as `money` but returns a string — safer for CSV / receipt text. */
export function moneyStr(x: MoneyInput): string {
  return d(x).toFixed(MONEY_DP, Decimal.ROUND_HALF_UP)
}

/** `a + b + c + …` — any number of addends, each may be null/undefined (treated as 0). */
export function sum(...values: MoneyInput[]): number {
  return money(values.reduce<Decimal>((acc, v) => acc.plus(d(v)), new Decimal(0)))
}

/** Sum a list via a selector. Convenience for `.reduce`-style aggregations. */
export function sumBy<T>(items: readonly T[], pick: (x: T) => MoneyInput): number {
  return money(items.reduce<Decimal>((acc, it) => acc.plus(d(pick(it))), new Decimal(0)))
}

export function add(a: MoneyInput, b: MoneyInput): number { return money(d(a).plus(d(b))) }
export function sub(a: MoneyInput, b: MoneyInput): number { return money(d(a).minus(d(b))) }
export function mul(a: MoneyInput, b: MoneyInput): number { return money(d(a).times(d(b))) }
export function div(a: MoneyInput, b: MoneyInput): number {
  const denom = d(b)
  if (denom.isZero()) return 0
  return money(d(a).div(denom))
}

/** price × quantity → 2dp. Quantity is integer but we go through Decimal anyway. */
export function lineTotal(price: MoneyInput, quantity: MoneyInput): number {
  return mul(price, quantity)
}

/** Average (mean) of a money column — returns 0 when count is 0. */
export function average(total: MoneyInput, count: number): number {
  if (!count) return 0
  return div(total, count)
}

/** Exact-precision intermediate. Use when chaining several operations without
 *  rounding in between. Call `.toNumber()` via `money()` at the boundary. */
export function chain(x: MoneyInput): Decimal { return d(x) }

/**
 * Round to 3 decimal places — for stock quantities stored as NUMERIC(12,3).
 * Use this instead of `money()` whenever calculating how much stock to
 * add/subtract (e.g. 1 kg × 1000 conversion = 1000.000 g, 3 cups × 20g = 60.000 g).
 */
export const QTY_DP = 3
export function qty(x: MoneyInput): number {
  return d(x).toDecimalPlaces(QTY_DP, Decimal.ROUND_HALF_UP).toNumber()
}

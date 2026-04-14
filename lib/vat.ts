import type { Company } from '@/types/database'

/**
 * VAT configuration lives on `companies.settings` (JSONB). This helper reads
 * it with safe defaults and provides the cart/sale-level computation used by
 * POS, receipt rendering, and the createSale action.
 *
 *   mode='none'     → VAT disabled; no breakdown anywhere
 *   mode='excluded' → prices are net; VAT added on top at checkout
 *   mode='included' → prices already contain VAT; break it out for reporting
 *
 * A line item can be individually VAT-exempt via product.vat_exempt or its
 * category.vat_exempt. Exempt items contribute to the subtotal but never to
 * the VAT amount.
 */

export type VatMode = 'none' | 'included' | 'excluded'

export type VatConfig = {
  mode: VatMode
  /** Rate expressed as a percentage, e.g. 7 means 7%. */
  rate: number
}

export const DEFAULT_VAT_CONFIG: VatConfig = { mode: 'none', rate: 7 }

/** Extract VAT config from a company.settings blob with defensive defaults. */
export function getVatConfig(company: Pick<Company, 'settings'> | null | undefined): VatConfig {
  const s = (company?.settings ?? {}) as { vat_mode?: unknown; vat_rate?: unknown }
  const mode: VatMode =
    s.vat_mode === 'included' || s.vat_mode === 'excluded' ? s.vat_mode : 'none'
  const rawRate = Number(s.vat_rate)
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 7
  return { mode, rate }
}

export type VatLine = {
  price:      number
  quantity:   number
  vatExempt:  boolean
}

export type VatBreakdown = {
  /** Net (pre-VAT) subtotal. Always equals the sum of line subtotals minus VAT. */
  subtotalExVat: number
  vatAmount:     number
  total:         number
}

/** Round to 2 decimal places in a cash-safe way (no floating-point drift). */
function money(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeVat(lines: VatLine[], config: VatConfig): VatBreakdown {
  const gross = lines.reduce((s, l) => s + l.price * l.quantity, 0)

  if (config.mode === 'none' || config.rate <= 0) {
    return { subtotalExVat: money(gross), vatAmount: 0, total: money(gross) }
  }

  const rate = config.rate / 100
  let vatableGross = 0
  let exemptGross  = 0
  for (const l of lines) {
    const sub = l.price * l.quantity
    if (l.vatExempt) exemptGross += sub
    else             vatableGross += sub
  }

  if (config.mode === 'excluded') {
    // Prices are net. VAT is added on top of vatable lines.
    const vat = vatableGross * rate
    const total = vatableGross + exemptGross + vat
    return {
      subtotalExVat: money(vatableGross + exemptGross),
      vatAmount:     money(vat),
      total:         money(total),
    }
  }

  // 'included' — prices contain VAT. Split vatable lines; exempt ones pass through.
  const vatableNet = vatableGross / (1 + rate)
  const vat        = vatableGross - vatableNet
  return {
    subtotalExVat: money(vatableNet + exemptGross),
    vatAmount:     money(vat),
    total:         money(vatableGross + exemptGross),
  }
}

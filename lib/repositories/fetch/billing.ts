import type {
  PlatformSettings,
  Subscription,
  SubscriptionPayment,
  PlatformInvoice,
  InvoiceStatus,
} from '@/types/database'
import type {
  BillingRepository,
  PlatformSettingsInput,
  SubscriptionInput,
  RecordPaymentInput,
  IssueInvoiceInput,
  InvoiceListRow,
  SubscriptionListRow,
  PlatformDashboardSummary,
} from '@/lib/repositories/contracts/billing'
import { restGet, restPost, restPatch, restPatchById } from '@/lib/api/rest'

export const fetchBillingRepo: BillingRepository = {
  async getSettings(): Promise<PlatformSettings> {
    const rows = await restGet<PlatformSettings[]>('platform_settings', {
      code:  'eq.default',
      limit: '1',
    })
    if (!rows[0]) throw new Error('platform settings not found')
    return rows[0]
  },

  async updateSettings(input: PlatformSettingsInput): Promise<string | null> {
    try {
      await restPatch('platform_settings', { code: 'eq.default' }, {
        ...input,
        updated_at: new Date().toISOString(),
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listSubscriptions(): Promise<SubscriptionListRow[]> {
    const data = await restGet<Array<Subscription & {
      companies: { name: string } | Array<{ name: string }> | null
      plans:     { name: string } | Array<{ name: string }> | null
    }>>('subscriptions', {
      select: '*,companies!inner(name),plans!inner(name)',
      status: 'neq.cancelled',
      order:  'created_at.desc',
    })
    return data.map((row) => {
      const co   = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans
      return {
        ...row,
        company_name: co?.name   ?? '',
        plan_name:    plan?.name ?? '',
      }
    })
  },

  async getSubscriptionByCompany(companyId: string): Promise<Subscription | null> {
    const rows = await restGet<Subscription[]>('subscriptions', {
      company_id: `eq.${companyId}`,
      status:     'neq.cancelled',
      limit:      '1',
    })
    return rows[0] ?? null
  },

  async createSubscription(companyId: string, input: SubscriptionInput): Promise<string | null> {
    try {
      await restPost('subscriptions', {
        company_id:           companyId,
        plan_code:            input.plan_code,
        status:               input.status ?? 'active',
        current_period_start: input.current_period_start,
        current_period_end:   input.current_period_end,
        notes:                input.notes ?? null,
      })
      return null
    } catch (e) {
      return String(e)
    }
  },

  async updateSubscription(id, input): Promise<string | null> {
    try {
      await restPatchById('subscriptions', id, input)
      return null
    } catch (e) {
      return String(e)
    }
  },

  async listPaymentsBySubscription(subscriptionId: string): Promise<SubscriptionPayment[]> {
    return restGet<SubscriptionPayment[]>('subscription_payments', {
      subscription_id: `eq.${subscriptionId}`,
      order:           'paid_at.desc',
    })
  },

  async recordPayment(input: RecordPaymentInput): Promise<{ id: string } | null> {
    try {
      const rows = await restPost<Array<{ id: string }>>('subscription_payments', input)
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string }
      return row ?? null
    } catch {
      return null
    }
  },

  async getPlatformSummary(): Promise<PlatformDashboardSummary> {
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    type CompanyRow = { id: string; name: string; status: string; plan: string; owner_id: string | null }
    type SubRow = { company_id: string; status: string; plan_code: string; overdue_months: number; billing_cycle: string }
    type PlanRow = { code: string; monthly_price_baht: string | null }
    type PaymentRow = { id: string; company_id: string; amount_baht: string; method: string; paid_at: string; receipt_path: string | null }

    const [companies, subscriptions, plans, payments] = await Promise.all([
      restGet<CompanyRow[]>('companies', { select: 'id,name,status,plan,owner_id' }),
      restGet<SubRow[]>('subscriptions', {
        select: 'company_id,status,plan_code,overdue_months,billing_cycle',
        status: 'neq.cancelled',
      }),
      restGet<PlanRow[]>('plans', { select: 'code,monthly_price_baht' }),
      restGet<PaymentRow[]>('subscription_payments', {
        select: 'id,company_id,amount_baht,method,paid_at,receipt_path',
        order:  'paid_at.desc',
        limit:  '10',
      }),
    ])

    const planPriceMap: Record<string, number> = {}
    for (const p of plans) {
      planPriceMap[p.code] = Number(p.monthly_price_baht ?? 0)
    }

    const companyMap: Record<string, string> = {}
    for (const c of companies) companyMap[c.id] = c.name

    const companyStatusMap: Record<string, string> = {}
    for (const c of companies) companyStatusMap[c.id] = c.status

    const totalCompanies     = companies.length
    const activeCompanies    = companies.filter((c) => c.status === 'active').length
    const suspendedCompanies = companies.filter((c) => c.status === 'suspended').length
    const pendingCompanies   = companies.filter((c) => c.status === 'pending').length

    const activeSubs = subscriptions.filter((s) => s.status === 'active')
    const mrrBaht = activeSubs.reduce((sum, s) => sum + (planPriceMap[s.plan_code] ?? 0), 0)
    const overdueCount = subscriptions.filter((s) => s.overdue_months > 0).length

    const statusBreakdownMap: Record<string, number> = {}
    for (const s of subscriptions) {
      statusBreakdownMap[s.status] = (statusBreakdownMap[s.status] ?? 0) + 1
    }
    const statusBreakdown = Object.entries(statusBreakdownMap).map(([status, count]) => ({ status, count }))

    const revenueThisMonthBaht = payments
      .filter((p) => new Date(p.paid_at) >= thisMonthStart)
      .reduce((sum, p) => sum + Number(p.amount_baht), 0)

    const recentPayments = payments.map((p) => ({
      id:           p.id,
      company_name: companyMap[p.company_id] ?? p.company_id,
      amount_baht:  Number(p.amount_baht),
      method:       p.method,
      paid_at:      p.paid_at,
      receipt_path: p.receipt_path,
    }))

    const attentionCompanies = subscriptions
      .filter((s) => s.status === 'past_due' || s.status === 'suspended' || s.overdue_months > 0)
      .map((s) => ({
        id:             s.company_id,
        name:           companyMap[s.company_id] ?? s.company_id,
        status:         companyStatusMap[s.company_id] ?? 'unknown',
        sub_status:     s.status,
        overdue_months: s.overdue_months,
        plan_code:      s.plan_code,
      }))

    return {
      totalCompanies, activeCompanies, suspendedCompanies, pendingCompanies,
      mrrBaht, revenueThisMonthBaht, overdueCount,
      statusBreakdown, recentPayments, attentionCompanies,
    }
  },

  async listInvoices(opts?: { companyId?: string; status?: InvoiceStatus }): Promise<InvoiceListRow[]> {
    const params: Record<string, string | string[]> = {
      select: 'id,invoice_no,company_id,issued_at,due_at,status,buyer_name,total_baht,vat_baht,subtotal_baht',
      order:  'issued_at.desc',
    }
    if (opts?.companyId) params.company_id = `eq.${opts.companyId}`
    if (opts?.status)    params.status     = `eq.${opts.status}`
    return restGet<InvoiceListRow[]>('platform_invoices', params)
  },

  async getInvoice(id: string): Promise<PlatformInvoice | null> {
    const rows = await restGet<PlatformInvoice[]>('platform_invoices', {
      id: `eq.${id}`, limit: '1',
    })
    return rows[0] ?? null
  },

  async issueInvoice(input: IssueInvoiceInput): Promise<{ id: string; invoice_no: string } | null> {
    try {
      const [settings, companies] = await Promise.all([
        restGet<PlatformSettings[]>('platform_settings', { code: 'eq.default', limit: '1' }),
        restGet<Array<{ name: string; tax_id: string | null; address: string | null; contact_email: string | null; contact_phone: string | null }>>('companies', {
          select: 'name,tax_id,address,contact_email,contact_phone',
          id:     `eq.${input.company_id}`,
          limit:  '1',
        }),
      ])
      const setting = settings[0]
      const company = companies[0]
      if (!setting || !company) return null

      const subtotal = input.lines.reduce((s, l) => s + l.amount_baht, 0)
      const vatRate  = setting.vat_enabled ? Number(setting.vat_rate_pct) : 0
      const vat      = Math.round(subtotal * vatRate / 100 * 100) / 100
      const total    = subtotal + vat

      const rows = await restPost<Array<{ id: string; invoice_no: string }>>('platform_invoices', {
        company_id:          input.company_id,
        subscription_id:     input.subscription_id ?? null,
        payment_id:          input.payment_id      ?? null,
        due_at:              input.due_at           ?? null,
        status:              'issued',
        seller_name:         setting.seller_name,
        seller_tax_id:       setting.seller_tax_id    ?? null,
        seller_address:      setting.seller_address   ?? null,
        seller_phone:        setting.seller_phone     ?? null,
        seller_email:        setting.seller_email     ?? null,
        buyer_name:          company.name,
        buyer_tax_id:        company.tax_id           ?? null,
        buyer_address:       company.address          ?? null,
        buyer_contact_email: company.contact_email    ?? null,
        buyer_contact_phone: company.contact_phone    ?? null,
        lines:               input.lines,
        subtotal_baht:       subtotal,
        vat_rate_pct:        vatRate,
        vat_baht:            vat,
        total_baht:          total,
        notes:               input.notes ?? null,
      })
      const row = Array.isArray(rows) ? rows[0] : rows as { id: string; invoice_no: string }
      return row ?? null
    } catch {
      return null
    }
  },

  async updateInvoiceStatus(id, status, voidReason): Promise<string | null> {
    try {
      const patch: Record<string, unknown> = { status }
      if (status === 'void') {
        patch.void_reason = voidReason ?? null
        patch.voided_at   = new Date().toISOString()
      }
      await restPatchById('platform_invoices', id, patch)
      return null
    } catch (e) {
      return String(e)
    }
  },
}

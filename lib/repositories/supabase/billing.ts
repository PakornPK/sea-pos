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
import { getDb } from './db'

export const supabaseBillingRepo: BillingRepository = {

  // ─── Platform settings ──────────────────────────────────────
  async getSettings(): Promise<PlatformSettings> {
    const db = await getDb()
    const { data, error } = await db
      .from('platform_settings')
      .select('*')
      .eq('code', 'default')
      .single()
    if (error) throw new Error(error.message)
    return data as PlatformSettings
  },

  async updateSettings(input: PlatformSettingsInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db
      .from('platform_settings')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('code', 'default')
    return error?.message ?? null
  },

  // ─── Subscriptions ──────────────────────────────────────────
  async listSubscriptions(): Promise<SubscriptionListRow[]> {
    const db = await getDb()
    const { data, error } = await db
      .from('subscriptions')
      .select(`
        *,
        companies!inner(name),
        plans!inner(name)
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as unknown as Subscription),
      company_name: (row.companies as { name: string }).name,
      plan_name:    (row.plans as { name: string }).name,
    }))
  },

  async getSubscriptionByCompany(companyId: string): Promise<Subscription | null> {
    const db = await getDb()
    const { data } = await db
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .maybeSingle()
    return (data as Subscription | null) ?? null
  },

  async createSubscription(companyId: string, input: SubscriptionInput): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('subscriptions').insert({
      company_id:           companyId,
      plan_code:            input.plan_code,
      status:               input.status ?? 'active',
      current_period_start: input.current_period_start,
      current_period_end:   input.current_period_end,
      notes:                input.notes ?? null,
    })
    return error?.message ?? null
  },

  async updateSubscription(
    id: string,
    input: Partial<SubscriptionInput & { overdue_months: number }>
  ): Promise<string | null> {
    const db = await getDb()
    const { error } = await db.from('subscriptions').update(input).eq('id', id)
    return error?.message ?? null
  },

  // ─── Payments ───────────────────────────────────────────────
  async listPaymentsBySubscription(subscriptionId: string): Promise<SubscriptionPayment[]> {
    const db = await getDb()
    const { data } = await db
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('paid_at', { ascending: false })
    return (data ?? []) as SubscriptionPayment[]
  },

  async recordPayment(input: RecordPaymentInput): Promise<{ id: string } | null> {
    const db = await getDb()
    const { data, error } = await db
      .from('subscription_payments')
      .insert(input)
      .select('id')
      .single()
    if (error) return null
    return { id: data.id }
  },

  // ─── Dashboard ──────────────────────────────────────────────
  async getPlatformSummary(): Promise<PlatformDashboardSummary> {
    const db = await getDb()

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [
      { data: companies },
      { data: subscriptions },
      { data: plans },
      { data: payments },
    ] = await Promise.all([
      db.from('companies').select('id,name,status,plan'),
      db.from('subscriptions').select('company_id,status,plan_code,overdue_months,billing_cycle').neq('status', 'cancelled'),
      db.from('plans').select('code,monthly_price_baht'),
      db.from('subscription_payments')
        .select('id,company_id,amount_baht,method,paid_at,receipt_path')
        .order('paid_at', { ascending: false })
        .limit(10),
    ])

    const planPriceMap: Record<string, { monthly: number; yearly: number }> = {}
    for (const p of plans ?? []) {
      planPriceMap[p.code] = {
        monthly: Number(p.monthly_price_baht ?? 0),
        yearly:  Number((p as Record<string, unknown>).yearly_price_baht ?? 0),
      }
    }

    const companyMap: Record<string, string> = {}
    for (const c of companies ?? []) companyMap[c.id] = c.name

    const companyStatusMap: Record<string, string> = {}
    for (const c of companies ?? []) companyStatusMap[c.id] = c.status

    const subByCompany: Record<string, typeof subscriptions extends (infer T)[] | null ? T : never> = {}
    for (const s of subscriptions ?? []) {
      if (s) subByCompany[s.company_id] = s
    }

    const totalCompanies     = companies?.length ?? 0
    const activeCompanies    = companies?.filter((c) => c.status === 'active').length ?? 0
    const suspendedCompanies = companies?.filter((c) => c.status === 'suspended').length ?? 0
    const pendingCompanies   = companies?.filter((c) => c.status === 'pending').length ?? 0

    const activeSubs = (subscriptions ?? []).filter((s) => s.status === 'active')
    // MRR = monthly price for monthly subs + yearly price / 12 for yearly subs
    const mrrBaht = activeSubs.reduce((sum, s) => {
      const prices = planPriceMap[s.plan_code]
      if (!prices) return sum
      const monthly = s.billing_cycle === 'yearly'
        ? (prices.yearly > 0 ? prices.yearly / 12 : prices.monthly)
        : prices.monthly
      return sum + monthly
    }, 0)

    const overdueCount = (subscriptions ?? []).filter((s) => s.overdue_months > 0).length

    const statusBreakdownMap: Record<string, number> = {}
    for (const s of subscriptions ?? []) {
      statusBreakdownMap[s.status] = (statusBreakdownMap[s.status] ?? 0) + 1
    }
    const statusBreakdown = Object.entries(statusBreakdownMap).map(([status, count]) => ({ status, count }))

    const revenueThisMonthBaht = (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= thisMonthStart)
      .reduce((sum, p) => sum + Number(p.amount_baht), 0)

    const recentPayments = (payments ?? []).map((p) => ({
      id:           p.id,
      company_name: companyMap[p.company_id] ?? p.company_id,
      amount_baht:  Number(p.amount_baht),
      method:       p.method,
      paid_at:      p.paid_at,
      receipt_path: p.receipt_path ?? null,
    }))

    const attentionCompanies = (subscriptions ?? [])
      .filter((s) => s.status === 'past_due' || s.status === 'suspended' || s.overdue_months > 0)
      .map((s) => ({
        id:            s.company_id,
        name:          companyMap[s.company_id] ?? s.company_id,
        status:        companyStatusMap[s.company_id] ?? 'unknown',
        sub_status:    s.status,
        overdue_months: s.overdue_months,
        plan_code:     s.plan_code,
      }))

    return {
      totalCompanies, activeCompanies, suspendedCompanies, pendingCompanies,
      mrrBaht, revenueThisMonthBaht, overdueCount,
      statusBreakdown, recentPayments, attentionCompanies,
    }
  },

  // ─── Invoices ────────────────────────────────────────────────
  async listInvoices(opts?: { companyId?: string; status?: InvoiceStatus }): Promise<InvoiceListRow[]> {
    const db = await getDb()
    let q = db
      .from('platform_invoices')
      .select('id,invoice_no,company_id,issued_at,due_at,status,buyer_name,total_baht,vat_baht,subtotal_baht')
      .order('issued_at', { ascending: false })
    if (opts?.companyId) q = q.eq('company_id', opts.companyId)
    if (opts?.status)    q = q.eq('status', opts.status)
    const { data } = await q
    return (data ?? []) as InvoiceListRow[]
  },

  async getInvoice(id: string): Promise<PlatformInvoice | null> {
    const db = await getDb()
    const { data } = await db
      .from('platform_invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    return (data as PlatformInvoice | null) ?? null
  },

  async issueInvoice(input: IssueInvoiceInput): Promise<{ id: string; invoice_no: string } | null> {
    const db = await getDb()

    // Fetch seller info + buyer info in parallel
    const [{ data: settings }, { data: company }] = await Promise.all([
      db.from('platform_settings').select('*').eq('code', 'default').single(),
      db.from('companies').select('name,tax_id,address,contact_email,contact_phone').eq('id', input.company_id).single(),
    ])
    if (!settings || !company) return null

    const subtotal = input.lines.reduce((s, l) => s + l.amount_baht, 0)
    const vatRate  = settings.vat_enabled ? Number(settings.vat_rate_pct) : 0
    const vat      = Math.round(subtotal * vatRate / 100 * 100) / 100
    const total    = subtotal + vat

    const { data, error } = await db
      .from('platform_invoices')
      .insert({
        company_id:          input.company_id,
        subscription_id:     input.subscription_id ?? null,
        payment_id:          input.payment_id ?? null,
        due_at:              input.due_at ?? null,
        status:              'issued',
        // Seller snapshot
        seller_name:         settings.seller_name,
        seller_tax_id:       settings.seller_tax_id ?? null,
        seller_address:      settings.seller_address ?? null,
        seller_phone:        settings.seller_phone ?? null,
        seller_email:        settings.seller_email ?? null,
        // Buyer snapshot
        buyer_name:          company.name,
        buyer_tax_id:        company.tax_id ?? null,
        buyer_address:       company.address ?? null,
        buyer_contact_email: company.contact_email ?? null,
        buyer_contact_phone: company.contact_phone ?? null,
        // Lines + amounts
        lines:               input.lines,
        subtotal_baht:       subtotal,
        vat_rate_pct:        vatRate,
        vat_baht:            vat,
        total_baht:          total,
        notes:               input.notes ?? null,
      })
      .select('id,invoice_no')
      .single()
    if (error) return null
    return { id: data.id, invoice_no: data.invoice_no }
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus, voidReason?: string): Promise<string | null> {
    const db = await getDb()
    const patch: Record<string, unknown> = { status }
    if (status === 'void') {
      patch.void_reason = voidReason ?? null
      patch.voided_at   = new Date().toISOString()
    }
    const { error } = await db.from('platform_invoices').update(patch).eq('id', id)
    return error?.message ?? null
  },
}

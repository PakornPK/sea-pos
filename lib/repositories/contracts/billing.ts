import type {
  PlatformSettings,
  Subscription,
  SubscriptionPayment,
  PlatformInvoice,
  InvoiceLine,
  PaymentMethod,
  InvoiceStatus,
} from '@/types/database'

// ─── Input types ──────────────────────────────────────────────────────────────

export type PlatformSettingsInput = Partial<Omit<PlatformSettings, 'code' | 'invoice_year' | 'invoice_seq' | 'updated_at'>>

export type SubscriptionInput = {
  plan_code:            string
  status?:              Subscription['status']
  current_period_start: string
  current_period_end:   string
  notes?:               string | null
}

export type RecordPaymentInput = {
  subscription_id: string
  company_id:      string
  amount_baht:     number
  paid_at:         string
  method:          PaymentMethod
  reference_no?:   string | null
  note?:           string | null
  period_start:    string
  period_end:      string
  receipt_path?:   string | null
}

export type IssueInvoiceInput = {
  company_id:      string
  subscription_id?: string | null
  payment_id?:      string | null
  due_at?:          string | null
  lines:            InvoiceLine[]
  notes?:           string | null
}

// ─── List row types ───────────────────────────────────────────────────────────

export type InvoiceListRow = Pick<
  PlatformInvoice,
  | 'id' | 'invoice_no' | 'company_id' | 'issued_at' | 'due_at'
  | 'status' | 'buyer_name' | 'total_baht' | 'vat_baht' | 'subtotal_baht'
>

export type SubscriptionListRow = Subscription & {
  company_name: string
  plan_name:    string
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface BillingRepository {
  // Platform settings (singleton)
  getSettings(): Promise<PlatformSettings>
  updateSettings(input: PlatformSettingsInput): Promise<string | null>

  // Subscriptions
  listSubscriptions(): Promise<SubscriptionListRow[]>
  getSubscriptionByCompany(companyId: string): Promise<Subscription | null>
  createSubscription(companyId: string, input: SubscriptionInput): Promise<string | null>
  updateSubscription(id: string, input: Partial<SubscriptionInput & { overdue_months: number }>): Promise<string | null>

  // Payments
  listPaymentsBySubscription(subscriptionId: string): Promise<SubscriptionPayment[]>
  recordPayment(input: RecordPaymentInput): Promise<{ id: string } | null>

  // Invoices
  listInvoices(opts?: { companyId?: string; status?: InvoiceStatus }): Promise<InvoiceListRow[]>
  getInvoice(id: string): Promise<PlatformInvoice | null>
  issueInvoice(input: IssueInvoiceInput): Promise<{ id: string; invoice_no: string } | null>
  updateInvoiceStatus(id: string, status: InvoiceStatus, voidReason?: string): Promise<string | null>
}

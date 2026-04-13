# SEA-POS Roadmap

Rolling feature backlog across releases. Items are grouped by the release
they belong to; ticks move up as they ship.

## Release 1 — Multi-tenancy (in progress)

### Done (this session)
- [x] `companies` table + `company_id` column on every business table
- [x] RLS rewritten for tenant isolation (`get_current_company_id()` joins with existing role checks)
- [x] `handle_new_user` trigger creates a fresh company on self-serve signup, or attaches to an invited company
- [x] `profiles.company_id` + `AuthedUser.companyId`
- [x] `CompanyRepository` contract + Supabase adapter (`getCurrent`, `updateSettings`, `updateName`)
- [x] Demo seed (`reset_and_demo.sql`) puts every row under the `SEA-POS Demo Store` company

### Deferred to later in R1
- [ ] **Signup page** — currently only `/login` exists. Need `/signup` that creates `auth.users` + triggers company creation via `handle_new_user`
- [ ] **Company settings UI** — `/settings/company` for admin to edit name, logo, receipt header, tax ID, phone
- [ ] **Invitation flow** — admin invites email → magic link with `company_id` in metadata → new user auto-joins
- [ ] **Company switcher** — for internal support staff with multiple company memberships (requires `company_members` join table; single-company users never see it)
- [ ] **Billing / plan management** — Stripe hookup, plan-gated features, usage tracking
- [ ] **Legal & data residency** — per-company data export, GDPR delete, terms acceptance log

## Release 2 — Multi-branch (not started)

- [ ] `branches` table (company_id, name, address, receipt_prefix, tax_id)
- [ ] Move `products.stock` → `product_stock(product_id, branch_id, quantity)` pivot table
- [ ] Add `branch_id` to `sales`, `purchase_orders`, `stock_logs`
- [ ] `user_branches(user_id, branch_id, is_default)` — users scoped to branches
- [ ] Branch picker in POS header (defaults to user's home branch)
- [ ] Branch filter in reports + dashboard KPIs
- [ ] Receipt-number sequence per branch (or per company — decide)
- [ ] Inventory transfer between branches (new flow)

## Release 3 — Promotions, coupons, loyalty (not started)

### Promotion engine
- [ ] `discount_rules` (company_id, type, scope, trigger, value, schedule, usage_limits)
- [ ] Types: percent-off, fixed-off, buy-X-get-Y, bundle, happy-hour, first-purchase
- [ ] Engine that takes a cart + active rules → returns applicable discounts (priority / stackable logic)
- [ ] Admin UI to create/edit rules

### Coupons
- [ ] `coupons` (code, type, value, valid_window, max_uses, per_customer_limit)
- [ ] Cashier enters code at checkout → validation → discount applied
- [ ] `coupon_redemptions` audit trail

### Loyalty points
- [ ] `loyalty_programs` (company_id, earn_rate, redeem_rate, tier_config)
- [ ] `loyalty_accounts` (customer_id, balance, tier, lifetime_earned)
- [ ] `loyalty_transactions` (customer_id, sale_id, points_delta, reason)
- [ ] Earn rules: flat rate, tier-based multiplier, category bonus
- [ ] Redeem flow: customer-facing balance, cashier selects points at checkout
- [ ] POS shows customer's balance during customer pick

### Cashback / store credit
- [ ] `store_credit` table (customer_id, balance)
- [ ] Credit from voided sales, refunds, birthday gifts
- [ ] Apply at checkout like a coupon

## Release 4 — Customization hooks (future)

- [ ] **Custom fields (UDF)** on Product / Customer / Sale — jsonb `custom_fields` + `custom_field_definitions` table
- [ ] Admin UI to define fields per entity
- [ ] Forms auto-render custom fields
- [ ] CSV exports include custom fields

## Cross-cutting infrastructure (ongoing)

- [ ] **Audit log** — generic `audit_events(company_id, actor_id, action, entity_type, entity_id, diff jsonb)` — append-only, viewable in Admin
- [ ] **Rate limiting** on Server Actions to block abuse (especially login, coupon redemption)
- [ ] **Background jobs** — `pg_cron` or Supabase Edge Functions for: nightly reports, expired coupon cleanup, low-stock emails
- [ ] **i18n framework** — extract Thai strings to a message catalog; add English as second locale
- [ ] **Print layouts** — proper 80mm thermal receipt + A4 invoice templates
- [ ] **Barcode scanning** in POS via `USB HID` or camera (QuaggaJS)
- [ ] **Mobile-optimized POS** — current layout assumes desktop; tablet mode for counter staff
- [ ] **API layer** — public REST/GraphQL for integrations (e-commerce sync, accounting)

## Known tech debt

- [ ] Split `stock_logs.change` into signed quantity + action type (`sale` | `receive` | `adjust` | `void_return`) for cleaner reporting
- [ ] Add `deleted_at` soft-delete to customers/products/suppliers instead of hard-blocking delete when FK exists
- [ ] Move `receipt_no` generation from sequence to per-company sequence (Release 2 prerequisite)
- [ ] Index on `sales.created_at` for faster range queries as volume grows
- [ ] Consolidate `next_sku_for_category` and `decrement_stock` into a single `functions/` folder with versioned definitions

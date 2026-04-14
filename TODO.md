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

### Shipped in MVP1 finalization
- [x] **Signup page `/signup`** (gated by `NEXT_PUBLIC_ENABLE_SIGNUP`) — self-serve path exists in code; disabled for MVP1 invite-only launch
- [x] **Company settings UI `/settings/company`** — admin edits company name, phone, address, tax ID, receipt header/footer
- [x] **Invite fix** — admin creating a user via `/users` now passes `company_id` so the invitee joins the admin's company
- [x] **Auth trigger polished** — `handle_new_user` honors optional `company_name` in metadata

### Shipped: Invite-only platform admin (MVP1 model)
- [x] **`companies.status`** lifecycle (`pending` / `active` / `suspended` / `closed`)
- [x] **`profiles.is_platform_admin`** flag + `is_platform_admin()` SQL helper + RLS bypass for all-tenant visibility
- [x] **Bootstrap `platform@sea-pos.com`** (password `PlatformAdmin1234!` — change after first login)
- [x] **`/platform/companies`** list, detail, and create-company flow (creates company + first admin user in one step)
- [x] **Activate / suspend / close** buttons on company detail page
- [x] **Status gate** — users of pending/suspended/closed companies land on `/blocked` instead of the app
- [x] **Sidebar platform section** — "แพลตฟอร์ม → บริษัทลูกค้า / แพ็กเกจ" visible only to platform admins

### Shipped: Storage (Supabase Storage as S3)
- [x] **Migration 013** — 5 buckets created with RLS + tenant-scoped paths (`{companyId}/...`):
  - `products` (public, 5MB, image/*) — product photos
  - `company-assets` (public, 2MB, image/*) — logo + letterhead
  - `receipts` (private, 10MB, image/pdf) — attached receipts/invoices
  - `imports` (private, 20MB, csv/xlsx) — CSV import staging
  - `exports` (private, 50MB) — generated reports + backups
- [x] **`StorageRepository` contract + adapter** — `upload`, `remove`, `getPublicUrl`, `createSignedUrl`, `listByCompany`. UI never touches Supabase storage directly.
- [x] **Product images** — `ProductImageUpload` (form), `ProductThumb` (inline grid editor); thumbnails on POS grid + ProductTable; `next.config.ts` whitelists Supabase host
- [x] **Company logo + letterhead** — `CompanyLogoUpload` on `/settings/company`; logo + meta render on receipt page
- [ ] **Receipt attachments** — bucket + RLS ready; UI to attach scanned receipts to sales/POs is pending
- [ ] **CSV import wizard** — bucket ready; need import UI for products/customers/suppliers
- [ ] **Backup exports** — bucket ready; need scheduled export job + admin download list

### Shipped: Plan management + limits enforcement
- [x] **`plans` config table** — replaces hardcoded enum. 4 seeded tiers: `free` / `lite_pro` / `standard_pro` / `enterprise`
- [x] **`companies.plan` → FK(plans.code)** — renaming/adding plans no longer requires code deploy
- [x] **Usage enforcement** — `addProduct` and `createUser` actions check `max_products` / `max_users` before insert; return friendly Thai error pointing the admin to upgrade
- [x] **Usage cards on `/settings/company`** — live "X / Y สินค้า", "X / Y ผู้ใช้งาน" with progress bars, "ใกล้เต็ม" warning at 80%, "ใช้เต็มแล้ว" at 100%
- [x] **`/platform/plans`** — platform admin edits name, description, price, and three limits (`max_products`, `max_users`, `max_branches`); each limit empty = unlimited
- [x] **`CompanyPlanControls`** now loads plans from DB + shows ฿price + 3 limits per card

### Deferred beyond MVP1
- [ ] **Flip to self-serve signup** — set `NEXT_PUBLIC_ENABLE_SIGNUP=true` + change `handle_new_user` to start new companies as `pending`
- [ ] **Magic-link invitations** — email the invitee a sign-in link. Current flow: admin sets password, shares it out-of-band
- [ ] **Company switcher** — for support staff with multiple company memberships (`company_members` join table)
- [ ] **Stripe billing** — plan pricing is recorded but not charged; wire Stripe Checkout + webhook to flip `status` on payment events
- [ ] **Platform dashboard** — cross-company MRR / active users / sales volume charts
- [ ] **Impersonate-as-customer** — platform admins click into a company and operate as their admin for support (audit-logged)
- [ ] **Legal & data residency** — per-company data export, GDPR delete, terms acceptance log
- [ ] **Email verification** — turn on Supabase's `Confirm email` + build confirmation page
- [ ] **Password reset flow** — `/forgot-password` + email link

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

---

# Backend rebuild — remove Supabase (MVP2)

Contract to implement: [api-spec.md](api-spec.md). The application (server
actions + UI) does not change — only the adapter under
`lib/repositories/supabase/` is replaced. Target: a self-hosted backend
we own end-to-end, no Supabase dependency.

## Recommended stack

| Layer        | Choice                                    | Why                                                                 |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------- |
| Runtime      | **NestJS (Node 20+)** or **Fastify + TSOA** | Same language as the frontend; strong DI + OpenAPI generation       |
| DB           | **Postgres 16**                           | Matches current schema; keeps RLS option open                       |
| ORM          | **Drizzle** (preferred) or **Prisma**     | Drizzle: closer to SQL, first-class transactions; Prisma: easier migrations |
| Auth         | **Lucia** + argon2 + HTTP-only cookies    | Lightweight, session-based (matches current cookie flow)            |
| Storage      | **MinIO** (S3 API) behind CDN / signed URLs | Drop-in for Supabase Storage; works on any VPS                      |
| Job runner   | **BullMQ + Redis** (deferred — Release 1 not needed) | For export generation / backups                                     |
| Deploy       | **Docker Compose** → **Fly.io / Hetzner** | Single Postgres + MinIO + API container                             |

Alternative stacks that meet the spec: Go (chi + sqlc + scs), Rust (axum + sqlx), Elixir (Phoenix). Pick one by team familiarity — the contract is stack-agnostic.

## Phase 0 — Scaffolding (1–2 days)

- [ ] Bootstrap NestJS project with TS strict, pnpm, biome/eslint
- [ ] Postgres container + initial migration with all 12 tables from [api-spec.md §2](api-spec.md) (copy DDL from `supabase/001…013`)
- [ ] Drizzle schema + first migration generates idempotent DDL matching current DB
- [ ] Env scaffolding: `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_*`, `SERVICE_ROLE_SECRET`
- [ ] Healthcheck + request/response logging + request-id middleware
- [ ] `docker-compose.yml` — api + postgres + minio + caddy

## Phase 1 — Auth & session (3 days)

- [ ] `POST /auth/signin` — email + password → HTTP-only cookie `session=<opaque>`
- [ ] `POST /auth/signout`
- [ ] `POST /auth/signup` — with `{email, password, full_name, company_name}` (validations per spec §4.1)
- [ ] Session middleware — resolves `userId` on every request
- [ ] Password hashing: argon2id, per-user salt
- [ ] `handle_new_user` behaviour in code (see api-spec.md §4.3) — create profile, optionally create company on self-serve
- [ ] Rate-limit signin (10/min/ip) to replace "not built" in this repo

**Exit criteria**: current signIn/signUp/signOut actions work against new backend via an alternate adapter.

## Phase 2 — Tenancy + RBAC (2 days)

- [ ] `profiles` table with `role`, `company_id`, `is_platform_admin`
- [ ] Request context carries `{userId, role, companyId, isPlatformAdmin}`
- [ ] **Guard pattern**: every data endpoint checks role (see matrix in api-spec.md §6.2). Helpers `@Roles('admin', 'manager')`
- [ ] **Tenant scoping**: every query wrapped in a `withTenant(companyId)` helper that auto-injects `WHERE company_id = ?` — default ON, explicit opt-out for admin-only endpoints
- [ ] Cross-tenant write protection — `assertTargetInMyCompany` re-implemented on user endpoints

## Phase 3 — Table CRUD endpoints (5–7 days)

Each table maps to one REST controller. For each one, implement the exact
calls listed in api-spec.md §2. Use the same query primitives (eq/gt/or/ilike/range/count).

- [ ] `companies` (user + admin scoped variants)
- [ ] `plans`
- [ ] `categories`
- [ ] `products` — including `listInStockPaginated` with search, `createReturning`, `updateImageUrl`
- [ ] `stock_logs` (insert only)
- [ ] `customers` — including paginated search over name/phone/email
- [ ] `suppliers`
- [ ] `sales` — including `markVoided` CAS pattern
- [ ] `sale_items`
- [ ] `purchase_orders`
- [ ] `purchase_order_items` — including `replaceItems` (DELETE + bulk INSERT)

**Testing**: per controller, port the current repo tests (or write new
ones) hitting a real ephemeral Postgres. No mocks.

## Phase 4 — Transactional RPCs (2 days)

Implement as `SECURITY DEFINER` SQL functions (easiest) or as service
methods wrapped in `BEGIN … COMMIT` with `SELECT … FOR UPDATE`.

- [ ] `decrement_stock(productId, quantity, saleId, userId)` — row lock, validate stock, update, insert stock_log (see api-spec.md §3.1)
- [ ] `next_sku_for_category(categoryId)` — scan + max+1 per prefix
- [ ] `receive_po_item(itemId, qty, userId)` — row lock, increment qty, stock++, stock_log, maybe flip PO status

**Load test** concurrency on `decrement_stock` — target: no oversell under 100 concurrent sale requests on the same SKU.

## Phase 5 — Storage (3 days)

- [ ] MinIO deployment + 5 buckets with per-bucket size + MIME policies (spec §5.1)
- [ ] `POST /storage/upload` — multipart; server prepends `{companyId}/`; rejects wrong MIME/size; returns `{path, publicUrl?}`
- [ ] `GET /storage/public/{bucket}/{path}` for public buckets (via CDN) + `getPublicUrl` helper
- [ ] `POST /storage/sign` — returns short-lived signed URL for private buckets
- [ ] `DELETE /storage/{bucket}/{path}` — tenant check
- [ ] `GET /storage/list?bucket=&prefix=` — tenant-prefix only
- [ ] GC job: nightly sweep of orphaned `products/*` and `company-assets/*` not referenced in DB

## Phase 6 — Admin surface (2 days)

Uses a separate `X-Service-Role-Token` header (NOT a user session).

- [ ] `POST /admin/users` (create with company_id)
- [ ] `PATCH /admin/users/:id`
- [ ] `DELETE /admin/users/:id`
- [ ] `POST /admin/users/:id/signout`
- [ ] `GET /admin/users?perPage=1000`
- [ ] Platform-admin-only company endpoints (`listAll`, `setStatus`, `setPlan`, `createWithOwner`)

## Phase 7 — Analytics endpoints (2 days)

Port the 10 methods in `AnalyticsRepository`. The Supabase impl buckets
in application code — for the new backend, do the aggregation in SQL
where it's cheaper:

- [ ] `todaySummary` → single query with `SUM + COUNT` filtered by today
- [ ] `dailySeries` → `GROUP BY DATE_TRUNC('day', created_at)`
- [ ] `paymentMix` → `GROUP BY payment_method`
- [ ] `topProducts` → `JOIN sale_items + sales`, `GROUP BY product_id` with sort
- [ ] `lowStock` → `WHERE stock <= min_stock`
- [ ] `recentSales`, `inventoryValueByCategory`, `stockMovements`, `salesByRange`, `salesRowsByRange`

## Phase 8 — Hardening & parity (3 days)

- [ ] Indexes: `(company_id, name)` on products/customers/suppliers, `(company_id, created_at DESC)` on sales/stock_logs, partial `(company_id, stock) WHERE stock > 0` on products
- [ ] Structured error responses: `{ error: string, code?: string, field?: string }` — matches expected shape in `lib/repositories/supabase/*`
- [ ] OpenAPI spec generated and committed
- [ ] Postman / Bruno collection for every endpoint
- [ ] Load test — 100 concurrent `createSale`, measure P95 latency
- [ ] Backup cron — nightly `pg_dump` + MinIO replication
- [ ] Observability: pino logs → Loki; metrics → Prometheus `/metrics`; traces via OTel
- [ ] Secrets rotation doc — how to rotate SESSION_SECRET, SERVICE_ROLE_SECRET

## Phase 9 — Frontend cut-over (2 days)

- [ ] New adapter `lib/repositories/http/*.ts` calling the new API over `fetch`, implementing every repo interface from api-spec.md §8
- [ ] `lib/repositories/index.ts` — toggle between `supabase` and `http` adapters by env var (`BACKEND=http|supabase`)
- [ ] Run full e2e suite against new backend in staging
- [ ] Replace `lib/supabase/server.ts` + `admin.ts` + `client.ts` usage in `lib/auth.ts` with HTTP equivalents, OR keep session cookie handling identical if the new backend serves cookies directly
- [ ] Update `proxy.ts` (Next.js middleware) to call new backend's `GET /auth/me` instead of Supabase's `auth.getUser`
- [ ] Delete `lib/supabase/*` + `lib/repositories/supabase/*` + Supabase-specific SQL (`supabase/*.sql`) once shadow-running passes for 7 days

## Data migration

One-time job:

- [ ] Export from Supabase: `pg_dump` schema + data for every table in [api-spec.md §2](api-spec.md)
- [ ] Import into new Postgres; verify row counts match
- [ ] Migrate storage objects: for each bucket, `aws s3 sync` from Supabase to MinIO
- [ ] Migrate auth: export `auth.users` (emails, created_at) + send password-reset links; OR bulk-rehash using Supabase's bcrypt hashes if accessible
- [ ] Dry-run with a sandbox company first; verify app works end-to-end before production cut-over

## Risks & mitigations

| Risk                                              | Mitigation                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Password migration breaks existing user logins    | Force password reset on cut-over day; email all admins in advance           |
| `receipt_no` sequence conflicts post-import       | Import data, then `SELECT setval('receipt_number_seq', MAX(receipt_no))`    |
| Cross-tenant leak in new backend                  | Automated test per endpoint: log in as tenant A, attempt read of tenant B   |
| RLS-replacement bugs                              | Keep Supabase running in parallel; route 5% traffic to new backend first    |
| Storage GC deletes in-use objects                 | Soft-delete first (rename to `_trash/`), hard-delete after 30 days          |
| `decrement_stock` deadlocks under concurrency     | Always lock in consistent order (by `product_id` ASC) within a transaction   |

## Cut-over sequence

1. Ship new backend + new HTTP adapter in `main` (feature-flagged)
2. Staging environment runs 100% on new backend for 1 week
3. Production shadow-run: new backend receives duplicate writes (fire-and-forget), verify data matches daily
4. Flip read traffic 5% → 25% → 100% over 3 days
5. Flip writes atomically at a low-traffic window (02:00 Asia/Bangkok) after one final Supabase → new-backend sync
6. Decommission Supabase after 14-day retention window

## Explicitly out of scope for MVP2

- GraphQL / public REST API for integrations (still Release-4 work)
- Changing any domain model
- UI changes (the adapter swap must be invisible to end users)
- Moving off Next.js

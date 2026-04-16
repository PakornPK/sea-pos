# Backend API Spec — Data-Layer Contract

This document lists **every call the app makes to its backend** (currently
Supabase). A rebuild replaces Supabase by implementing the same set of
operations behind any API of your choice (REST, gRPC, GraphQL, raw SQL).
Nothing in this spec is Supabase-specific — the call shapes are
generalized so you can host them elsewhere.

Source of truth: `lib/repositories/supabase/*.ts`. Each method maps 1:1
to a logical backend endpoint.

---

## 1. Two client modes

The server makes calls under two different identities. The new backend
must support both.

### 1.1 User client (RLS-scoped)
- Carries the end-user's session (via HTTP-only cookie in current stack)
- Every read/write is implicitly filtered by the user's `company_id`
  through Row-Level Security, plus role checks
- Used for 95% of business operations

### 1.2 Admin client (service-role, bypasses tenancy)
- Authenticates with a server-held secret
- Bypasses RLS entirely — can read/write across tenants
- Used only for:
  - User provisioning / deletion / password reset / force sign-out
  - Platform-admin cross-company reads (`listAll` on companies, users)
  - `createWithOwner` (provision new tenant + first admin atomically)
- Never exposed to the browser

### 1.3 Auth model
- **Sign-in**: email + password → session cookie
- Every request enters a proxy (`proxy.ts`) that validates the cookie
  and injects `x-sea-user-id` on the internal request — the rest of the
  app trusts this header
- **Backend requirement**: the API must return a session token on
  sign-in, accept it on subsequent requests, and expose the
  authenticated `userId` to application code

---

## 2. Data operations (tables)

Each subsection is a logical table endpoint. For every method, this
document lists: **HTTP-style verb · filter · select columns · order ·
limit**. A rebuild can expose these as REST routes such as
`GET /products?gt.stock=0&search=X&page=1` — the verbs and constraints
are what matter, not the URL shape.

Query primitives used:
- `eq(col, v)` — equality
- `gt(col, v)` — greater than
- `gte/lte(col, v)` — range
- `ilike(col, pattern)` — case-insensitive LIKE (`%` wildcard)
- `or([predicates])` — any of
- `order(col, asc|desc)`
- `range(from, to)` — offset pagination, zero-indexed, inclusive
- `count('exact')` — return total count alongside page rows
- `single()` — return exactly one row or error
- `maybeSingle()` — return zero-or-one row
- `head: true` — count only, no rows returned
- `insert` / `update` / `delete` — standard mutations
- Nested select (`rel:table(cols)`) — returns joined row(s) under a named
  sub-object; equivalent to a LEFT JOIN + JSON aggregation

### 2.1 `companies`

| Op | Verb | Filter | Select / Set | Notes |
| --- | --- | --- | --- | --- |
| `getCurrent` | SELECT | none (RLS auto-filters to caller's company) | `*` — limit 1 | `maybeSingle` |
| `getById` | SELECT | `id = :id` | `*` | `maybeSingle` |
| `updateSettings` | UPDATE | `id = :id` | set `settings = :jsonb` | |
| `updateName` | UPDATE | `id = :id` | set `name = :text` | |
| `listAll` (admin) | SELECT | none | `*` order by `created_at DESC` | Joined with profile counts + owner email client-side |
| `setStatus` (admin) | UPDATE | `id = :id` | set `status = :enum` | |
| `setPlan` (admin) | UPDATE | `id = :id` | set `plan = :text` (FK plans.code) | |
| `createWithOwner` (admin) | multi-step | — | (1) create auth user (2) `INSERT companies` `{name, owner_id, plan='free', status='active'}` returning id (3) upsert profile `{id=userId, role='admin', full_name, company_id=new}`. Compensating delete of auth user on rollback. | |
| `updateBillingInfo` (admin) | UPDATE | `id = :id` | set `{tax_id, address, contact_email, contact_phone}` | admin client |

### 2.2 `plans`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listActive` | SELECT | `is_active = true` | `*` order by `sort_order ASC` |
| `listAll` | SELECT | none | `*` order by `sort_order ASC` |
| `getByCode` | SELECT | `code = :code` | `*` `maybeSingle` |
| `update` | UPDATE | `code = :code` | set all of `{name, description, max_products, max_users, max_branches, monthly_price_baht, yearly_price_baht, sort_order, is_active}` |

> `listAllWithUsage` returns `PlanWithUsage = Plan & { company_count: number }` (in-memory join with companies count per plan code).

### 2.3 `profiles` (admin client only)

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `countByCompany` | SELECT count | `company_id = :id` | `head=true` |
| `listByCompany` | SELECT | `company_id = :id` | `id, role, full_name` |
| `listAllBasic` | SELECT | none | `id, role, full_name` (platform admin) |
| `getCompanyId` | SELECT | `id = :id` | `company_id` `maybeSingle` |
| `upsertProfile` | UPSERT | pk=`id` | `{id, role, full_name, company_id}` |
| `updateProfile` | UPDATE | `id = :id` | set `{role, full_name}` |

### 2.4 `categories`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `list` | SELECT | none (RLS) | `*` order by `name` |
| `create` | INSERT | — | `{name, sku_prefix}` |
| `updatePrefix` | UPDATE | `id = :id` | set `sku_prefix` |
| `delete` | DELETE | `id = :id` | — |

### 2.5 `products`

| Op | Verb | Filter | Select / Set | Notes |
| --- | --- | --- | --- | --- |
| `countAll` | SELECT count | none | `head=true` | plan-limit check |
| `listAll` | SELECT | none | `*` order by `name` | |
| `listWithCategory` | SELECT | none | `*, category:categories(id, name)` order by `name` | joined |
| `listInStock` | SELECT | `stock > 0` | `*` order by `name` | |
| `listInStockPaginated` | SELECT + count | `stock > 0` plus optional `or(name.ilike.%:q%, sku.ilike.%:q%)` | `*` count=exact, range=from..to, order by `name` | search sanitizes `%`,`,` |
| `listWithCategoryPaginated` | SELECT + count | optional `category_id = :id` | `*, category:categories(id, name)` count=exact, range, order by `name` | |
| `getStock` | SELECT | `id = :id` | `stock` `single` | |
| `create` | INSERT | — | `ProductInsert` returning `id` `single` | |
| `createReturning` | INSERT | — | `ProductInsert` returning `id, sku, name, price, cost, stock, min_stock, category_id, image_url, created_at` `single` | price/cost cast to number |
| `updateStock` | UPDATE | `id = :id` | set `stock = :int` | |
| `updateImageUrl` | UPDATE | `id = :id` | set `image_url = :text\|null` | |
| `delete` | DELETE | `id = :id` | — | |

### 2.6 `stock_logs`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `insert` | INSERT | — | `{product_id, change, reason, user_id}` |

### 2.7 `customers`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `list` | SELECT | none | `*` order by `name` |
| `listForPicker` | SELECT | none | `id, name, phone` order by `name` |
| `listPaginated` | SELECT + count | optional `or(name.ilike.%:q%, phone.ilike.%:q%, email.ilike.%:q%)` (backslash-escape `%`,`_`) | `*` count=exact, range, order by `name` |
| `getById` | SELECT | `id = :id` | `*` `single` |
| `create` | INSERT | — | `CustomerInput` |
| `createReturning` | INSERT | — | `{name, phone}` returning `id, name, phone` `single` |
| `update` | UPDATE | `id = :id` | `CustomerInput` |
| `delete` | DELETE | `id = :id` | — |
| `hasSales` | SELECT count | `customer_id = :id` on `sales` | `head=true` |

### 2.8 `suppliers`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `list` | SELECT | none | `*` order by `name` |
| `listPaginated` | SELECT + count | none | `*` count=exact, range, order by `name` |
| `create` | INSERT | — | `SupplierInput` |
| `update` | UPDATE | `id = :id` | `SupplierInput` |
| `delete` | DELETE | `id = :id` | — |
| `hasOrders` | SELECT count | `supplier_id = :id` on `purchase_orders` | `head=true` |

### 2.9 `sales`

| Op | Verb | Filter | Select / Set | Notes |
| --- | --- | --- | --- | --- |
| `listRecent` | SELECT | none | `id, receipt_no, created_at, total_amount, payment_method, status, customer:customers(name)` order by `receipt_no DESC` limit :N | |
| `listRecentPaginated` | SELECT + count | none | (same cols) count=exact, range, order `receipt_no DESC` | |
| `listForCustomer` | SELECT | `customer_id = :id` | `id, receipt_no, created_at, total_amount, payment_method, status` order by `receipt_no DESC` | |
| `listCompletedForStats` | SELECT | `status = 'completed'` | `customer_id, total_amount, created_at, status` | |
| `getById` | SELECT | `id = :id` | `*, customer:customers(name, phone)` `single` | |
| `getStatus` | SELECT | `id = :id` | `status` `single` | |
| `createHeader` | INSERT | — | `{user_id, customer_id, total_amount, payment_method, status='completed'}` returning `id` `single` | `receipt_no` autogenerated by DB sequence |
| `markVoided` | UPDATE | `id = :id AND status = 'completed'` | set `status = 'voided'` returning `id` | boolean: whether any row matched |

### 2.10 `sale_items`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `insertItems` | INSERT (bulk) | — | `[{sale_id, product_id, quantity, unit_price, subtotal}, …]` |
| `listItems` | SELECT | `sale_id = :id` | `product_id, quantity` |
| `listItemsWithProduct` | SELECT | `sale_id = :id` | `*, product:products(name, sku)` order by `id` |

### 2.11 `purchase_orders`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listRecent` | SELECT | none | `id, po_no, status, total_amount, ordered_at, received_at, created_at, supplier:suppliers(name)` order by `po_no DESC` limit :N |
| `listRecentPaginated` | SELECT + count | optional `status = :enum` | (same cols) count=exact, range, order `po_no DESC` |
| `getById` | SELECT | `id = :id` | `*` `single` |
| `getStatus` | SELECT | `id = :id` | `status` `single` |
| `createHeader` | INSERT | — | `{supplier_id, user_id, total_amount, notes, status='draft'}` returning `id` `single` |
| `updateHeader` | UPDATE | `id = :id` | set `{supplier_id, notes, total_amount}` |
| `confirm` | UPDATE | `id = :id AND status = 'draft'` | set `status = 'ordered', ordered_at = now()` |
| `cancel` | UPDATE | `id = :id` | set `status = 'cancelled'` |

### 2.12 `purchase_order_items`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listItemsWithProduct` | SELECT | `po_id = :id` | `id, product_id, quantity_ordered, quantity_received, unit_cost, product:products(name, sku)` |
| `replaceItems` | DELETE + INSERT | `po_id = :id`; then bulk insert `[{po_id, product_id, quantity_ordered, unit_cost}, …]` | — |

### 2.13 `platform_settings` (singleton)

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `getSettings` | SELECT | `code = 'default'` | `*` `maybeSingle` |
| `updateSettings` | UPDATE | `code = 'default'` | set `{seller_name, seller_tax_id, seller_address, seller_phone, seller_email, vat_enabled, vat_rate_pct, bank_name, bank_account_name, bank_account_no, promptpay_id, invoice_prefix}` |

### 2.14 `subscriptions`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listSubscriptions` | SELECT | `status != 'cancelled'` | `*, companies!inner(name), plans!inner(name)` order by `created_at DESC` |
| `getSubscriptionByCompany` | SELECT | `company_id = :id AND status != 'cancelled'` | `*` `maybeSingle` |
| `createSubscription` | INSERT | — | `{company_id, plan_code, status, billing_cycle, current_period_start, current_period_end, notes}` returning `id` |
| `updateSubscription` | UPDATE | `id = :id` | set `{status, billing_cycle, current_period_start, current_period_end, overdue_months, notes}` |

### 2.15 `subscription_payments`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listPaymentsBySubscription` | SELECT | `subscription_id = :id` | `*` order by `paid_at DESC` |
| `recordPayment` | INSERT | — | `{subscription_id, company_id, amount_baht, paid_at, method, reference_no, note, period_start, period_end, receipt_path}` returning `id` |

### 2.16 `platform_invoices`

| Op | Verb | Filter | Select / Set |
| --- | --- | --- | --- |
| `listInvoices` | SELECT | optional `company_id = :id`, optional `status = :enum` | `id, invoice_no, company_id, issued_at, due_at, status, buyer_name, total_baht, vat_baht, subtotal_baht` order by `issued_at DESC` |
| `getInvoice` | SELECT | `id = :id` | `*` `maybeSingle` |
| `issueInvoice` | INSERT | — | Fetches `platform_settings` + company for snapshots, computes VAT from lines; returns `{id, invoice_no}` |
| `updateInvoiceStatus` | UPDATE | `id = :id` | set `{status, void_reason, voided_at}` |

### 2.17 `getPlatformSummary` (dashboard aggregate)

Single method that queries `companies`, `subscriptions`, `plans`, and `subscription_payments` in parallel. Returns:

| Field | Description |
| --- | --- |
| `totalCompanies` | COUNT of all companies |
| `activeCompanies` | COUNT where status = 'active' |
| `suspendedCompanies` | COUNT where status = 'suspended' |
| `pendingCompanies` | COUNT where status = 'pending' |
| `mrrBaht` | MRR from active subscriptions — monthly: `monthly_price_baht`; yearly: `yearly_price_baht / 12` |
| `revenueThisMonthBaht` | SUM of `subscription_payments.amount_baht` for current calendar month |
| `overdueCount` | COUNT of subscriptions with `overdue_months > 0` |
| `statusBreakdown` | Array of `{status, count}` |
| `recentPayments` | Latest N payments with company name |
| `attentionCompanies` | Companies with `status IN ('past_due','suspended')` or `overdue_months > 0` |

---

## 3. RPCs (stored procedures)

The backend must expose these three transactional operations. They can be
SQL functions, a service method, or an endpoint — what matters is the
transactional semantics.

### 3.1 `decrement_stock(product_id, quantity, sale_id, user_id)`
Called by: POS `createSale`.

Must run in **one transaction with row-level locking** (`SELECT … FOR UPDATE` equivalent):
1. Lock the `products` row for `product_id`
2. If row missing → error `Product % not found`
3. If `stock < quantity` → error `Insufficient stock for product %: available %, requested %`
4. `UPDATE products SET stock = stock - quantity WHERE id = product_id`
5. `INSERT INTO stock_logs (product_id, change=-quantity, reason='ขาย #' || left(sale_id::text,8), user_id)`

Purpose: atomic stock decrement preventing oversell under concurrent sales.

### 3.2 `next_sku_for_category(category_id)`
Called by: `addProduct` / `quickCreateProduct` when SKU is blank.

Return: `string | null`. Format `{PREFIX}-{0001}` where `PREFIX = categories.sku_prefix`. Logic:
1. Read `sku_prefix` for the category. If null → return null.
2. Scan existing `products.sku` matching `PREFIX-####` pattern in this company.
3. Return `PREFIX-{max+1 zero-padded to 4}`.

### 3.3 `receive_po_item(item_id, qty, user_id)`
Called by: `receivePurchaseOrder` (once per row submitted).

Must run in one transaction:
1. Lock `purchase_order_items WHERE id = item_id`
2. `quantity_received = quantity_received + qty` (reject if exceeds `quantity_ordered`)
3. `UPDATE products SET stock = stock + qty WHERE id = product_id`
4. `INSERT stock_logs (product_id, change=qty, reason='รับของจาก PO', user_id)`
5. If every item of the parent PO now has `quantity_received >= quantity_ordered`:
   `UPDATE purchase_orders SET status='received', received_at=now() WHERE id = po_id`

### 3.4 `next_invoice_no()`
Called by: `issueInvoice` inside `BillingRepository`.

SECURITY DEFINER function. Atomically increments `platform_settings.invoice_seq`, resetting to `1` on a new calendar year. Returns the formatted invoice number string: `{invoice_prefix}-{YYYY}-{NNNN}` (e.g. `INV-2026-0001`).

---

## 4. Auth API

The current backend is Supabase Auth. A rebuild can be any IdP that
supports the operations below.

### 4.1 User-facing
| Call | Params | Returns |
| --- | --- | --- |
| `signInWithPassword` | `{email, password}`, `rememberMe?: boolean` (default `true`) | `null` on success (sets session cookie); else error string. When `rememberMe=false`, auth cookies are re-set without `maxAge` → become session cookies that expire on browser close |
| `signOut` | — | `null` / error string (clears session) |
| `signUp` | `{email, password, options.data: { full_name, company_name }}` | `null` / error string. On success, triggers `handle_new_user` (see §5.1) |

### 4.2 Admin (service role only)
| Call | Params | Returns |
| --- | --- | --- |
| `admin.createUser` | `{email, password, email_confirm=true, user_metadata: { role, full_name, company_id }}` | `{user: {id, ...}}` / error |
| `admin.updateUserById` | `(id, { password })` | ok / error |
| `admin.deleteUser` | `(id)` | ok / error |
| `admin.signOut` | `(id, scope='global'\|'others')` | ok / error |
| `admin.listUsers` | `{perPage}` (paged) | `{users: [{id, email, created_at}, ...]}` |

The new backend must expose equivalents. If building from scratch, a
minimal contract is:
- `POST /auth/signin {email, password} → {token}`
- `POST /auth/signout → 204`
- `POST /auth/signup {email, password, full_name, company_name} → {userId}`
- `POST /admin/users {email, password, role, full_name, company_id} → {id}`
- `PATCH /admin/users/:id {password?}`
- `DELETE /admin/users/:id`
- `POST /admin/users/:id/signout`
- `GET /admin/users?perPage=1000 → [{id, email, created_at}, ...]`

### 4.3 `handle_new_user` trigger (new-user bootstrap)
Fires on every successful signup/admin.createUser. Logic:

```
function handle_new_user(authUser):
    profile = { id: authUser.id,
                role: authUser.user_metadata.role || 'cashier',
                full_name: authUser.user_metadata.full_name
                             || left(email, '@'),
                company_id: null,
                is_platform_admin: false }

    if authUser.user_metadata.company_id:
        profile.company_id = company_id         # invited user
    elif authUser.user_metadata.company_name:
        co = INSERT companies (name=company_name,
                               owner_id=authUser.id,
                               plan='free',
                               status='active')
        profile.company_id = co.id              # self-serve signup
        profile.role = 'admin'
    # else: leave company_id null (platform admin, created manually)

    INSERT INTO profiles VALUES profile ON CONFLICT DO NOTHING
```

This logic can live in the backend or as a DB trigger — behaviour must
match regardless of implementation.

---

## 5. Storage API

Five logical buckets. The backend (S3-compatible, local disk + CDN, or any
object store) must enforce tenant-scoped prefixes via server-side
authorization (do NOT trust clients to pick the path prefix).

### 5.1 Bucket config

| Name              | Access  | Max size | Allowed MIME                                    |
| ----------------- | ------- | -------- | ----------------------------------------------- |
| `products`        | public  | 5 MB     | image/jpeg, image/png, image/webp              |
| `company-assets`  | public  | 2 MB     | image/jpeg, image/png, image/webp, image/svg+xml |
| `receipts`        | private | 10 MB    | image/* + application/pdf                       |
| `imports`         | private | 20 MB    | text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| `exports`         | private | 50 MB    | any                                             |

Public URL format: `{STORAGE_BASE}/storage/v1/object/public/{bucket}/{path}`

### 5.2 Operations
| Call | Params | Returns |
| --- | --- | --- |
| `upload` | `(bucket, path, file, {contentType, upsert=true})` | `null` / error. Server prepends `companyId/` to `path`. |
| `getPublicUrl` | `(bucket, fullPath)` | `string` for public buckets; `null` otherwise |
| `createSignedUrl` | `(bucket, fullPath, expiresSec=3600)` | `string` or `null` |
| `remove` | `(bucket, [fullPath])` | `null` / error |
| `list` | `(bucket, prefix=companyId/subpath)` | `[{name, metadata.size, created_at}]` |

### 5.3 Authorization (both app layer and storage layer)
1. **App layer**: the `upload` implementation always builds the path as
   `{companyId}/{relativePath}` where `companyId` comes from the session.
2. **Storage layer**: reject any read/write where the first path segment
   does not equal the caller's `companyId` (or the caller is a platform
   admin). Current impl: SQL function `storage_tenant_matches(name)`
   used in storage RLS. Equivalent in new backend: check on every API
   request before signing / serving / storing.

### 5.4 Where URLs are stored
- `products` bucket → URL written to `products.image_url`
- `company-assets` bucket → URL written to `companies.settings.logo_url`
  or `.letterhead_url`
- `receipts` bucket — `subscription_payments.receipt_path` stores the object path; a signed URL is generated on demand via the `getReceiptUrl()` server action (1-hour expiry). Never stored permanently.
- Other private buckets — no URL stored; short-lived signed URL is created on
  demand via `createDownloadUrl`.

---

## 6. Row-level security behaviour

Even after removing Supabase, the **business rules** that RLS currently
enforces must be preserved — either in the new backend's middleware or
as equivalent DB policies:

### 6.1 Tenant isolation (every business table)
```
SELECT / UPDATE / DELETE: company_id = current_user.company_id
                           OR current_user.is_platform_admin
INSERT: row.company_id = current_user.company_id
        (auto-filled from session if not provided)
```

### 6.2 Role checks (in addition to tenancy)
| Table                | INSERT allowed for                    | UPDATE allowed for          | DELETE allowed for |
| -------------------- | ------------------------------------- | --------------------------- | ------------------ |
| `products`           | admin, manager                        | admin, manager              | admin              |
| `stock_logs`         | admin, manager, cashier               | —                           | —                  |
| `customers`          | admin, manager, cashier               | admin, manager, cashier     | admin              |
| `suppliers`          | admin, manager, purchasing            | admin, manager, purchasing  | admin              |
| `sales`              | admin, manager, cashier               | admin, manager (for void)   | —                  |
| `sale_items`         | admin, manager, cashier               | —                           | —                  |
| `purchase_orders`    | admin, manager, purchasing            | admin, manager, purchasing  | —                  |
| `purchase_order_items`| admin, manager, purchasing           | admin, manager, purchasing  | —                  |
| `categories`         | admin, manager                        | admin, manager              | admin, manager     |
| `companies`          | platform admin only                   | company admin for own; platform admin for any | platform admin |
| `profiles`           | (created by trigger)                  | admin (same company)        | admin (same company) |
| `plans`              | platform admin only                   | platform admin only         | platform admin only |

### 6.3 Cross-tenant data leak prevention
Any admin-client (service-role) endpoint MUST:
1. Include an explicit `company_id` filter in the query, and
2. Verify the target's `company_id` matches the caller's before mutating
   (see `assertTargetInMyCompany` in the user actions).

---

## 7. Error surface

Every repository method returns errors in one of these shapes:

- `string | null` — `null` on success, Thai or English error message otherwise
- `{ error: string }` — for operations that also return data on success
- `throw` (admin RPCs like `decrement_stock`) — exception text propagates to the UI

The backend must return structured errors so the repository layer can
extract `.message`. Current stack uses Supabase's `PostgrestError` /
`AuthError` shapes (`{ message, code }`). Any REST rebuild should use a
similar `{ error: string, code?: string }` body with non-2xx status.

---

## 8. Non-functional requirements

### 8.1 Transactions required
- `createSale` → header + items + per-item stock decrement — must see
  stock changes atomically (`decrement_stock` RPC provides this)
- `voidSale` → `markVoided` CAS update + per-item stock restore +
  stock_logs inserts (current impl is not wrapped — acceptable for
  single-register stores; wrap in a TX when rebuilding)
- `receivePurchaseOrder` → per-item stock increment + status transition
  (`receive_po_item` RPC)
- `createWithOwner` → auth user + company row + profile upsert, with
  compensating delete if the company insert fails

### 8.2 Row locking
`decrement_stock` and `receive_po_item` require `SELECT … FOR UPDATE` to
serialize concurrent access to the same product row.

### 8.3 Sequences
- `receipt_number_seq` → `sales.receipt_no` (unique, monotonic)
- `purchase_order_number_seq` → `purchase_orders.po_no`

These are process-wide in current impl. Fine for single-tenant-per-db or
small multi-tenant; partition per `company_id` when scaling.

### 8.4 Performance
- Auth check is called many times per request (layout + page + actions)
  — cache it per-request to hit the profile store once
- Paginated list endpoints need an index on the order column (`name`,
  `receipt_no DESC`, `po_no DESC`, `created_at DESC`)
- `listInStockPaginated` benefits from a partial index on
  `(company_id, stock) WHERE stock > 0`

---

## 9. Summary: all calls the app makes to the backend

If you grep the codebase for Supabase usage, you'll find exactly these
calls. The new backend must cover every one:

### Tables (user client)
```
companies:                 select[getCurrent|getById], update(settings|name)
plans:                     select[listActive|listAll|getByCode], update
categories:                select[list], insert, update(sku_prefix), delete
products:                  select.count, select[listAll|listWithCategory|listInStock|listInStockPaginated|listWithCategoryPaginated|getStock], insert, update(stock|image_url), delete
stock_logs:                insert
customers:                 select[list|listForPicker|listPaginated|getById|hasSales.count], insert, update, delete
suppliers:                 select[list|listPaginated|hasOrders.count], insert, update, delete
sales:                     select[listRecent|listRecentPaginated|listForCustomer|listCompletedForStats|getById|getStatus], insert, update(status CAS)
sale_items:                insert bulk, select[listItems|listItemsWithProduct]
purchase_orders:           select[listRecent|listRecentPaginated|getById|getStatus], insert, update
purchase_order_items:      select(listItemsWithProduct), delete+insert bulk
platform_settings:         select[getSettings], update(settings)
subscriptions:             select[listSubscriptions|getSubscriptionByCompany], insert, update
subscription_payments:     select[listPaymentsBySubscription], insert(recordPayment)
platform_invoices:         select[listInvoices|getInvoice], insert(issueInvoice), update(status)
```

### Tables (admin client, service role)
```
companies:       select all, update(status|plan|billingInfo), insert (createWithOwner)
profiles:        select count/list, update(profile), upsert, select(company_id)
```

### RPCs (transactional)
```
decrement_stock(product_id, quantity, sale_id, user_id)
next_sku_for_category(category_id)
receive_po_item(item_id, qty, user_id)
next_invoice_no()  — sequential INV-YYYY-NNNN (SECURITY DEFINER, resets on new year)
```

### Auth
```
signInWithPassword(email, password, rememberMe?)
signOut()
signUp(email, password, data={full_name, company_name})
admin.createUser({email, password, email_confirm, user_metadata})
admin.updateUserById(id, {password})
admin.deleteUser(id)
admin.signOut(id, scope)
admin.listUsers({perPage})
```

### Storage (per bucket)
```
upload(bucket, path, file, {contentType, upsert})
getPublicUrl(bucket, path)
createSignedUrl(bucket, path, expiresSec)
remove(bucket, [path])
list(bucket, prefix)
```

### Analytics (user client, derived from tables above)
All `AnalyticsRepository` methods are composed of standard SELECTs on
`sales`, `sale_items`, `products`, `stock_logs` with range/eq filters.
They bucket in application code — no DB aggregation functions required.

### Side-effect triggers
```
on auth.users INSERT   → handle_new_user (creates profile, optional company)
```

---

Any backend that implements the calls in §9 with the semantics in §§2–7
is a drop-in replacement for the Supabase layer. The application code
(server actions, UI) requires no changes, only the adapter in
`lib/repositories/supabase/*` needs to be re-pointed.

# SEA-POS Feature Specification

> This file is the living spec for sea-pos. Update it whenever a feature is added, changed, or removed.

---

## Project Overview

**SEA-POS** is a Point of Sale (POS) and ERP system targeting Southeast Asian retail, with the UI written in Thai. The system allows store operators to manage inventory, run sales transactions, handle purchasing, manage customers, and view reports.

- **Status:** Foundation + Inventory module complete; ERP modules stubbed
- **Target market:** Thailand / Southeast Asia

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router) |
| UI Library | React 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL) |
| DB Client (browser) | `@supabase/ssr` — `createBrowserClient` |
| DB Client (server) | `@supabase/ssr` — `createServerClient` with cookies |
| Auth | Supabase Auth (email/password) |

---

## Architecture

### Rendering model
- Pages are **Server Components** by default — data is fetched on the server, no `useEffect`
- `'use client'` is used only for components that need state, event handlers, or browser APIs
- Mutations go through **Server Actions** (`'use server'`) — no direct client Supabase calls

### Auth layer
- `proxy.ts` (Next.js 16 — replaces `middleware.ts`) refreshes the Supabase session on every request
- Unauthenticated requests to any protected route are redirected to `/login`
- `app/(dashboard)/layout.tsx` performs a belt-and-suspenders auth check via `supabase.auth.getUser()`

### Data flow
```
Server Component page
  └── await createClient()          ← lib/supabase/server.ts
  └── supabase.from('table')...     ← server-side DB query
  └── <ClientComponent data={...}/> ← pass data as props

Client Component (interactive)
  └── calls Server Action            ← lib/actions/*.ts
  └── Server Action: createClient() ← lib/supabase/server.ts
  └── validates auth + mutates DB
  └── revalidatePath() / redirect()  ← triggers server re-render
```

### Environment variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (safe for browser)

---

## File Structure

```
sea-pos/
├── proxy.ts                    # Next.js 16 auth proxy (session refresh + redirect)
├── types/
│   └── database.ts             # All DB row, insert, and composite types
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createBrowserClient factory (Client Components only)
│   │   └── server.ts           # createServerClient factory (Server Components + Actions)
│   ├── actions/
│   │   ├── auth.ts             # signIn, signOut
│   │   ├── inventory.ts        # adjustStock, addProduct, deleteProduct
│   │   ├── pos.ts              # createSale (stub)
│   │   ├── purchasing.ts       # createPurchaseOrder (stub)
│   │   └── customers.ts        # createCustomer (stub)
│   └── utils.ts                # cn() — clsx + tailwind-merge helper
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── layout/
│   │   ├── Sidebar.tsx         # Nav sidebar with active link highlighting
│   │   ├── Header.tsx          # Top bar with user email
│   │   └── DashboardShell.tsx  # Grid wrapper: sidebar + main
│   ├── auth/
│   │   └── LoginForm.tsx       # Login form using useActionState(signIn)
│   └── inventory/
│       ├── ProductTable.tsx     # shadcn Table with stock levels and badges
│       ├── StockAdjustButton.tsx # +/- buttons using useTransition + adjustStock
│       └── AddProductForm.tsx   # Add product form using useActionState(addProduct)
└── app/
    ├── layout.tsx              # Root layout (fonts, metadata)
    ├── globals.css             # Tailwind v4 + shadcn CSS variables
    ├── (auth)/
    │   ├── layout.tsx          # Centered minimal layout (no sidebar)
    │   └── login/page.tsx      # Login page
    └── (dashboard)/
        ├── layout.tsx          # Auth guard + DashboardShell
        ├── page.tsx            # redirect → /inventory
        ├── inventory/
        │   ├── page.tsx        # Stock dashboard (Server Component)
        │   └── add/page.tsx    # Add product page
        ├── pos/page.tsx        # POS (stub)
        ├── purchasing/page.tsx # Purchasing (stub)
        ├── customers/page.tsx  # Customers (stub)
        └── reports/page.tsx    # Reports (stub)
```

---

## User Roles

Role-based access control is implemented via the `profiles` table + Supabase RLS.

| Role | Thai | Access |
|------|------|--------|
| `admin` | ผู้ดูแลระบบ | Full access — all modules + user role management |
| `manager` | ผู้จัดการร้าน | Inventory, POS, Purchasing, Reports — cannot delete users |
| `cashier` | พนักงานเก็บเงิน | POS only — create sales, view products/customers |
| `purchasing` | เจ้าหน้าที่จัดซื้อ | Purchase orders + suppliers only |

Roles are set in `raw_user_meta_data` at signup and synced to `profiles` via a DB trigger (`handle_new_user`). The `get_user_role()` SQL function is used in all RLS policies.

### Test Accounts (password: `Test1234!`)

| Email | Role |
|-------|------|
| `admin@sea-pos.test` | admin |
| `manager@sea-pos.test` | manager |
| `cashier@sea-pos.test` | cashier |
| `purchasing@sea-pos.test` | purchasing |

---

## Database Schema

> All tables are defined in `supabase/001_schema.sql`. Seed data (test accounts + sample products) is in `supabase/002_seed.sql`.

### `profiles`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, FK → auth.users.id |
| role | text | `'admin'` \| `'manager'` \| `'cashier'` \| `'purchasing'` |
| full_name | text \| null | Display name |
| created_at | timestamptz | |

### `products`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| sku | text | Stock-keeping unit identifier |
| name | text | Product display name |
| price | numeric(12,2) | Selling price (default 0) |
| cost | numeric(12,2) | Purchase cost (default 0) |
| stock | integer | Current stock quantity (default 0) |
| min_stock | integer | Low-stock warning threshold (default 0) |
| image_url | text \| null | Optional product image URL |
| created_at | timestamptz | Record creation time |

### `stock_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| product_id | uuid | FK → products.id |
| change | integer | Stock delta (positive = added, negative = removed) |
| reason | text \| null | Optional note |
| user_id | uuid \| null | FK → auth.users.id (cashier) |
| created_at | timestamptz | Log entry time |

### `customers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | |
| phone | text \| null | |
| email | text \| null | |
| address | text \| null | |
| created_at | timestamptz | |

### `suppliers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | |
| contact_name | text \| null | |
| phone | text \| null | |
| email | text \| null | |
| created_at | timestamptz | |

### `sales`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| customer_id | uuid \| null | FK → customers.id (nullable for walk-in) |
| user_id | uuid | FK → auth.users.id (cashier) |
| total_amount | numeric(12,2) | |
| payment_method | text | `'cash'` \| `'card'` \| `'transfer'` |
| status | text | `'completed'` \| `'voided'` |
| created_at | timestamptz | |

### `sale_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| sale_id | uuid | FK → sales.id ON DELETE CASCADE |
| product_id | uuid | FK → products.id |
| quantity | integer | |
| unit_price | numeric(12,2) | Price at time of sale (snapshot) |
| subtotal | numeric(12,2) | quantity × unit_price |

### `purchase_orders`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| supplier_id | uuid | FK → suppliers.id |
| user_id | uuid | FK → auth.users.id |
| status | text | `'draft'` \| `'ordered'` \| `'received'` \| `'cancelled'` |
| total_amount | numeric(12,2) | |
| ordered_at | timestamptz \| null | |
| received_at | timestamptz \| null | |
| created_at | timestamptz | |

### `purchase_order_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| po_id | uuid | FK → purchase_orders.id ON DELETE CASCADE |
| product_id | uuid | FK → products.id |
| quantity_ordered | integer | |
| quantity_received | integer | default 0 |
| unit_cost | numeric(12,2) | |

**RLS:** Fine-grained per-role policies are defined in `supabase/001_schema.sql`. See the User Roles section above for the permission matrix.

---

## Features

### Authentication

- **Purpose:** Protect all routes; only authenticated users can access the dashboard.
- **Routes/Files:** `/login` → [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx), [components/auth/LoginForm.tsx](components/auth/LoginForm.tsx)
- **Behavior:** Email/password login via Supabase Auth. Session managed via HTTP-only cookies (handled by `proxy.ts` + `@supabase/ssr`). Logout via sidebar button.

### Stock Management Dashboard

- **Purpose:** Central view for monitoring and adjusting product stock levels.
- **Routes/Files:** `/inventory` → [app/(dashboard)/inventory/page.tsx](app/(dashboard)/inventory/page.tsx)
- **Behavior:**
  - Server Component fetches all products ordered by name
  - Displays name, SKU, stock, min_stock, and status badge (ปกติ / ใกล้หมด)
  - **+** / **−** buttons adjust stock by 1 via `adjustStock` Server Action
  - Each stock change updates `products.stock` and inserts a `stock_logs` row with `user_id`
  - Stock cannot go below 0 (guarded in Server Action)
  - Page re-renders automatically via `revalidatePath('/inventory')`

### Add Product

- **Purpose:** Add new products to the catalog.
- **Routes/Files:** `/inventory/add` → [app/(dashboard)/inventory/add/page.tsx](app/(dashboard)/inventory/add/page.tsx)
- **Behavior:**
  - Fields: name (required), SKU, min_stock
  - Validates name is not empty; inserts with `stock: 0`
  - On success: redirects to `/inventory`
  - Inline error display via `useActionState`

### Sales / POS *(stub)*

- **Routes/Files:** `/pos` → [app/(dashboard)/pos/page.tsx](app/(dashboard)/pos/page.tsx), [lib/actions/pos.ts](lib/actions/pos.ts)
- **Planned:** Cart UI, checkout, receipt generation, sales history

### Purchasing *(stub)*

- **Routes/Files:** `/purchasing` → [app/(dashboard)/purchasing/page.tsx](app/(dashboard)/purchasing/page.tsx), [lib/actions/purchasing.ts](lib/actions/purchasing.ts)
- **Planned:** Purchase order creation, supplier management, goods receiving (auto-updates stock)

### Customers *(stub)*

- **Routes/Files:** `/customers` → [app/(dashboard)/customers/page.tsx](app/(dashboard)/customers/page.tsx), [lib/actions/customers.ts](lib/actions/customers.ts)
- **Planned:** Customer profiles, purchase history, contact info

### Reports *(stub)*

- **Routes/Files:** `/reports` → [app/(dashboard)/reports/page.tsx](app/(dashboard)/reports/page.tsx)
- **Planned:** Sales summaries, stock movement history (from stock_logs), low-stock report

### User Management *(admin only)*

- **Purpose:** Allow admins to create, edit, delete, and reset passwords for application users.
- **Routes/Files:**
  - `/users` → [app/(dashboard)/users/page.tsx](app/(dashboard)/users/page.tsx)
  - [components/users/AddUserForm.tsx](components/users/AddUserForm.tsx), [components/users/UserTable.tsx](components/users/UserTable.tsx)
  - [lib/actions/users.ts](lib/actions/users.ts), [lib/supabase/admin.ts](lib/supabase/admin.ts)
- **Behavior:**
  - Page redirects non-admin users to `/`
  - Lists all users (email, full_name, role) via `supabase.auth.admin.listUsers()` merged with `profiles`
  - **Add user:** inline form creates an auth user with `email_confirm: true` and upserts their profile
  - **Edit user:** inline row editor updates `profiles.full_name` and `profiles.role`
  - **Reset password:** inline row form sets a new password (min 8 chars)
  - **Delete user:** confirmation prompt then `auth.admin.deleteUser()`; cannot delete own account
  - All mutations run on the server with a service-role client that bypasses RLS — the client is never exposed to the browser
- **Constraints:** Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Role is always validated against the `UserRole` union.

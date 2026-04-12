# SEA-POS Feature Specification

> This file is the living spec for sea-pos. Update it whenever a feature is added, changed, or removed.

---

## Project Overview

**SEA-POS** is a Point of Sale (POS) and stock management system targeting Southeast Asian retail, with the UI written in Thai. The system allows store operators to track product inventory, adjust stock levels, and log stock changes over time.

- **Status:** Early MVP (2 pages implemented)
- **Target market:** Thailand / Southeast Asia

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router) |
| UI Library | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| DB Client | `@supabase/supabase-js` v2.103.0 |

---

## Architecture

- **Rendering:** All current pages are client components (`"use client"`) using `useState` / `useEffect`
- **Data access:** Direct Supabase client queries from the browser — no API routes or Server Actions
- **Auth:** None implemented; uses Supabase public anon key
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

---

## Database Schema

### `products`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| sku | string | Stock-keeping unit identifier |
| name | string | Product display name |
| stock | number | Current stock quantity |
| min_stock | number | Low-stock warning threshold |
| image_url | string \| null | Optional product image URL |
| created_at | timestamp | Record creation time |

### `stock_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key (implied) |
| product_id | uuid | FK → products.id |
| change | number | Stock delta (positive = added, negative = removed) |
| created_at | timestamp | Log entry time (implied) |

---

## Data Types

```typescript
// Defined in app/page.tsx
export type Product = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  min_stock: number;
  image_url: string | null;
  created_at: string;
};
```

---

## Features

### Stock Management Dashboard

- **Purpose:** Central view for monitoring and adjusting product stock levels.
- **Routes/Files:** `/` → [app/page.tsx](app/page.tsx)
- **Behavior:**
  - Fetches all products from the `products` table on load
  - Displays each product's name and current stock quantity (คงเหลือ)
  - **+** button increments stock by 1; **-** button decrements by 1
  - Each stock change: updates `products.stock` in Supabase, inserts a row into `stock_logs` with the delta, then re-fetches the product list
  - Shows a red warning (⚠️ สินค้าใกล้หมด!) when `stock <= min_stock`
- **Constraints:** No floor/ceiling on stock values; no confirmation on decrement.

### Add Product

- **Purpose:** Allow operators to add new products to the catalog.
- **Routes/Files:** `/add` → [app/add/page.tsx](app/add/page.tsx)
- **Behavior:**
  - Text input for product name with empty-name validation
  - Inserts a new row into `products` with the given name
  - Shows loading state during submission; alerts on success or error
  - Clears the input after a successful add
- **Constraints:** Only `name` is set on creation; `sku`, `min_stock`, and initial `stock` default to database defaults.

---

## File Structure

```
sea-pos/
├── app/
│   ├── page.tsx          # Stock management dashboard (Home)
│   ├── add/
│   │   └── page.tsx      # Add product form
│   ├── layout.tsx        # Root layout (fonts, metadata)
│   └── globals.css       # Tailwind imports + CSS variables
├── lib/
│   └── supabase.ts       # Supabase client singleton
├── public/               # Static assets
├── .env                  # Supabase credentials (not committed)
├── next.config.ts        # Next.js config
├── tsconfig.json         # TypeScript config (strict mode)
└── package.json          # Dependencies
```

---

## Known Gaps / Future Work

- No authentication — all data is publicly accessible via the anon key
- No Supabase Row Level Security (RLS) policies enforced in code
- Add product form does not set `sku`, `min_stock`, or initial `stock`
- No delete or edit product functionality
- No sales / POS transaction flow
- No reporting or stock history view (stock_logs are written but never displayed)
- UI uses inline styles rather than Tailwind utility classes
- No tests

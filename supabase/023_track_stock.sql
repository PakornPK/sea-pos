-- 023_track_stock.sql
-- Adds track_stock flag to products.
-- When false: product always appears in POS (no stock gate), stock is never
-- decremented on sale, and low-stock alerts are suppressed.
-- Useful for restaurants (dishes/menu items) and services.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true;

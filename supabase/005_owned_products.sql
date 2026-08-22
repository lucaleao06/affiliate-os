-- ── Migration 005 — owned digital products support ─────────────────────────
-- Adds product_type, cost, checkout_url, margin_pct to products table.
-- 'affiliate' = Shopee/marketplace product (default, existing behavior)
-- 'owned'     = e-book, digital product, own offer

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type  text NOT NULL DEFAULT 'affiliate'
    CHECK (product_type IN ('affiliate', 'owned')),
  ADD COLUMN IF NOT EXISTS cost          numeric(10,2),
  ADD COLUMN IF NOT EXISTS checkout_url  text,
  ADD COLUMN IF NOT EXISTS margin_pct    numeric(5,2);

-- For owned products:
--   marketplace     = 'owned'          (existing col, repurposed)
--   product_type    = 'owned'
--   price           = selling price
--   cost            = production/platform cost
--   margin_pct      = (price - cost) / price * 100  (can be computed client-side)
--   checkout_url    = Shopee, Hotmart, Kiwify, or any external checkout link
--   affiliate_url   = same as checkout_url (pipeline uses this for CTA)
--   commission_rate = 100 (owner keeps 100% minus platform fee)
--   url             = product landing page (optional)

-- Index for fast filter by type
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products (product_type);

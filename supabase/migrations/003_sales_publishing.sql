-- Migration 003: sales/commissions, publication_packages, autopilot_rules, notifications
-- Run in Supabase SQL editor or via supabase db push.

-- ─── PUBLICATION PACKAGES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publication_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id     UUID REFERENCES creatives(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  video_path      TEXT NOT NULL,
  video_filename  TEXT NOT NULL,
  download_url    TEXT NOT NULL,
  srt_path        TEXT,

  caption         TEXT NOT NULL DEFAULT '',
  cta             TEXT NOT NULL DEFAULT '',
  affiliate_url   TEXT,
  channel         TEXT NOT NULL DEFAULT 'manual',   -- instagram|tiktok|youtube_shorts|shopee_video|manual
  rights_status   TEXT NOT NULL DEFAULT 'unknown',  -- owned|seller_provided|licensed|generated|unknown

  duration_sec    NUMERIC(8,2) NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  width           INTEGER NOT NULL DEFAULT 1080,
  height          INTEGER NOT NULL DEFAULT 1920,
  codec           TEXT NOT NULL DEFAULT 'h264',

  checklist       JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',    -- draft|pending_rights|ready|publishing|published|failed|manual_required|scheduled
  status_reason   TEXT,

  platform_post_id TEXT,
  published_url    TEXT,
  published_at     TIMESTAMPTZ,
  scheduled_at     TIMESTAMPTZ,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pub_pkgs_creative ON publication_packages(creative_id);
CREATE INDEX IF NOT EXISTS idx_pub_pkgs_status ON publication_packages(status);
CREATE INDEX IF NOT EXISTS idx_pub_pkgs_channel ON publication_packages(channel);

-- ─── SALES / COMMISSIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  creative_id      UUID REFERENCES creatives(id) ON DELETE SET NULL,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  publication_id   UUID REFERENCES publication_packages(id) ON DELETE SET NULL,
  source_channel   TEXT,   -- instagram|tiktok|youtube_shorts|shopee_bio|etc

  -- Sale data
  order_id         TEXT,   -- platform order ID (from CSV or API)
  order_item_id    TEXT,
  platform         TEXT NOT NULL DEFAULT 'shopee',
  gross_value      NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate  NUMERIC(6,4),  -- 0.0800 = 8%

  -- Status lifecycle
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|paid|cancelled|invalid
  payout_status    TEXT NOT NULL DEFAULT 'unpaid',   -- unpaid|processing|paid
  payout_date      DATE,

  occurred_at      TIMESTAMPTZ,   -- when the sale happened
  confirmed_at     TIMESTAMPTZ,   -- when platform confirmed
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_source    TEXT,          -- 'csv_upload'|'api'|'manual'
  import_batch_id  TEXT,          -- batch reference for dedup

  raw_data         JSONB,         -- original CSV row or API payload

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_creative ON sales(creative_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_occurred ON sales(occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_order_dedup ON sales(order_id, platform) WHERE order_id IS NOT NULL;

-- ─── AUTOPILOT RULES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autopilot_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  mode                  TEXT NOT NULL DEFAULT 'PAUSED',    -- PAUSED|SUPERVISED|AUTOPILOT

  -- Quality gates
  min_score             INTEGER NOT NULL DEFAULT 70,        -- minimum AI score to auto-approve
  min_commission_rate   NUMERIC(6,4) NOT NULL DEFAULT 0.05, -- 5%
  max_risk_score        INTEGER NOT NULL DEFAULT 60,

  -- Allowed dimensions
  allowed_channels      TEXT[] NOT NULL DEFAULT '{}',
  allowed_categories    TEXT[] NOT NULL DEFAULT '{}',
  allowed_rights_status TEXT[] NOT NULL DEFAULT ARRAY['owned','seller_provided','licensed','generated'],

  -- Limits
  max_posts_per_day     INTEGER NOT NULL DEFAULT 3,
  require_human_approval BOOLEAN NOT NULL DEFAULT TRUE,

  -- Meta
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row (one global rules record for now)
INSERT INTO autopilot_rules (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event       TEXT NOT NULL,  -- creative_ready|approval_required|render_completed|render_failed|publication_ready|publication_failed|winner_detected|import_completed|import_failed
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event);

-- ─── SHOPEE IMPORT BATCHES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT NOT NULL DEFAULT 'shopee_csv',
  filename    TEXT,
  row_count   INTEGER,
  imported    INTEGER,
  skipped     INTEGER,
  errors      INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|completed|failed
  error_log   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

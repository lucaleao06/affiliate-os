-- AFFILIATE OS — Migration 001
-- Run in Supabase SQL Editor

-- ── workspaces ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Default',
  created_at  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.workspaces (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default') ON CONFLICT DO NOTHING;

-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid NOT NULL REFERENCES public.workspaces DEFAULT '00000000-0000-0000-0000-000000000001',
  marketplace      text NOT NULL DEFAULT 'shopee',
  url              text,
  affiliate_url    text,
  external_id      text,
  title            text NOT NULL,
  description      text,
  price            numeric(10,2),
  original_price   numeric(10,2),
  image_url        text,
  category         text,
  seller           text,
  rating           numeric(3,2),
  review_count     integer DEFAULT 0,
  sold_count       integer DEFAULT 0,
  commission_rate  numeric(5,2) DEFAULT 0,
  extra_commission numeric(5,2) DEFAULT 0,
  status           text NOT NULL DEFAULT 'active',
  raw_data         jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── product_scores ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products ON DELETE CASCADE,
  overall_score       integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  commission_score    integer DEFAULT 0,
  demand_score        integer DEFAULT 0,
  visual_score        integer DEFAULT 0,
  impulse_score       integer DEFAULT 0,
  competition_score   integer DEFAULT 0,
  trust_score         integer DEFAULT 0,
  risk_score          integer DEFAULT 0,
  recommendation      text,
  reasoning           text,
  provider            text DEFAULT 'mock',
  model               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces DEFAULT '00000000-0000-0000-0000-000000000001',
  product_id   uuid NOT NULL REFERENCES public.products ON DELETE CASCADE,
  name         text NOT NULL,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── creative_angles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creative_angles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns ON DELETE CASCADE,
  hooks       jsonb DEFAULT '[]',
  angles      jsonb DEFAULT '[]',
  scripts     jsonb DEFAULT '[]',
  ctas        jsonb DEFAULT '[]',
  captions    jsonb DEFAULT '[]',
  provider    text DEFAULT 'mock',
  model       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── creatives ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creatives (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns ON DELETE CASCADE,
  angle_id    uuid REFERENCES public.creative_angles,
  type        text NOT NULL DEFAULT 'video',
  format      text DEFAULT '9:16',
  hook        text,
  script      text,
  caption     text,
  cta         text,
  asset_url   text,
  status      text NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── publications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id  uuid NOT NULL REFERENCES public.creatives ON DELETE CASCADE,
  channel      text NOT NULL,
  status       text NOT NULL DEFAULT 'scheduled',
  published_at timestamptz,
  external_id  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── automation_runs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  status      text NOT NULL DEFAULT 'running',
  input       jsonb DEFAULT '{}',
  output      jsonb DEFAULT '{}',
  error       text,
  duration_ms integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS (permissive for MVP — single workspace) ──────────────────────────────
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- MVP: service role bypasses RLS; anon gets read-all for local dev
CREATE POLICY "anon_all" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.product_scores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.campaigns FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.creative_angles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.creatives FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.publications FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.automation_runs FOR ALL TO anon USING (true) WITH CHECK (true);

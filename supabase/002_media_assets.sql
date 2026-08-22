-- AFFILIATE OS — Migration 002
-- media_assets: track product/creative media files
-- Run in Supabase SQL Editor after 001_initial.sql

CREATE TABLE IF NOT EXISTS public.media_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces DEFAULT '00000000-0000-0000-0000-000000000001',
  product_id    uuid REFERENCES public.products ON DELETE SET NULL,
  creative_id   uuid REFERENCES public.creatives ON DELETE SET NULL,
  type          text NOT NULL, -- image | video | audio | font
  source        text NOT NULL DEFAULT 'unknown', -- owned | seller_provided | licensed | generated | test | unknown
  source_url    text,
  local_path    text,
  filename      text,
  mime_type     text,
  width         integer,
  height        integer,
  duration_sec  numeric(8,3),
  file_size     bigint,
  rights_status text NOT NULL DEFAULT 'unknown', -- owned | seller_provided | licensed | generated | test | unknown
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- render_jobs: track FFmpeg render jobs
CREATE TABLE IF NOT EXISTS public.render_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces DEFAULT '00000000-0000-0000-0000-000000000001',
  creative_id     uuid REFERENCES public.creatives ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'queued', -- queued | rendering | completed | failed
  engine          text NOT NULL DEFAULT 'ffmpeg',
  storyboard      jsonb DEFAULT '{}',
  started_at      timestamptz,
  completed_at    timestamptz,
  output_path     text,
  output_url      text,
  duration_sec    numeric(8,3),
  width           integer,
  height          integer,
  file_size       bigint,
  error           text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON public.media_assets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON public.render_jobs FOR ALL TO anon USING (true) WITH CHECK (true);

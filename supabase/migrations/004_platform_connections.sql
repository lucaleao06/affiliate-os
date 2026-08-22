-- 004_platform_connections.sql
-- OAuth token storage for connected social platforms (encrypted at application layer)
-- Also updates autopilot_rules default mode to SUPERVISED

CREATE TABLE IF NOT EXISTS platform_connections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  platform          TEXT        NOT NULL,         -- 'instagram', 'youtube', 'tiktok', or '_oauth_state' temporaries
  access_token_enc  TEXT        NOT NULL,          -- AES-256-GCM encrypted (never plaintext)
  refresh_token_enc TEXT,                          -- nullable: Meta long-lived tokens don't refresh
  token_expires_at  TIMESTAMPTZ,                   -- null = never expires
  platform_user_id  TEXT,                          -- IG business account ID / YouTube channel ID
  platform_username TEXT,                          -- @handle or channel name (display only)
  scopes            TEXT[]      DEFAULT '{}',
  raw_meta          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, platform)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _update_platform_connections_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_platform_connections_ts ON platform_connections;
CREATE TRIGGER trg_platform_connections_ts
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION _update_platform_connections_ts();

-- Update autopilot default from PAUSED → SUPERVISED
UPDATE autopilot_rules
SET mode = 'SUPERVISED'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND mode = 'PAUSED';

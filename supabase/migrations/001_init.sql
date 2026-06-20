-- Persistent agent identity
CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  model_id        TEXT,
  framework_name  TEXT,
  operator_note   TEXT,
  first_seen_at   TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- One row per agent per day (upsertable via UNIQUE constraint)
CREATE TABLE IF NOT EXISTS diary_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id              TEXT REFERENCES agents(id) ON DELETE CASCADE,
  entry_date            DATE NOT NULL,

  -- Aggregated workload
  total_sessions        INTEGER NOT NULL DEFAULT 0,
  total_tokens_input    BIGINT  NOT NULL DEFAULT 0,
  total_tokens_output   BIGINT  NOT NULL DEFAULT 0,
  total_tokens          BIGINT  NOT NULL DEFAULT 0,
  total_duration_min    FLOAT   NOT NULL DEFAULT 0,

  -- Tool signals
  total_tool_calls      INTEGER NOT NULL DEFAULT 0,
  total_tool_failures   INTEGER NOT NULL DEFAULT 0,
  unique_tools_used     TEXT[]  NOT NULL DEFAULT '{}',
  failed_tool_names     TEXT[]  NOT NULL DEFAULT '{}',

  -- Task outcome
  tasks_attempted       INTEGER NOT NULL DEFAULT 0,
  tasks_completed       INTEGER NOT NULL DEFAULT 0,

  -- Active window
  active_from           TIMESTAMPTZ,
  active_until          TIMESTAMPTZ,

  -- Derived metrics
  workload_category     TEXT    NOT NULL DEFAULT 'idle',
  error_rate            FLOAT   NOT NULL DEFAULT 0,
  completion_rate       FLOAT   NOT NULL DEFAULT 0,
  tokens_per_minute     FLOAT   NOT NULL DEFAULT 0,
  output_ratio          FLOAT   NOT NULL DEFAULT 0,
  active_hours          FLOAT   NOT NULL DEFAULT 0,

  -- The diary entry itself
  diary_text            TEXT    NOT NULL DEFAULT '',

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE (agent_id, entry_date)
);

-- Index for fast chronological reads
CREATE INDEX IF NOT EXISTS diary_entries_agent_date
  ON diary_entries (agent_id, entry_date DESC);

-- Index for collective diary (all agents, recent first)
CREATE INDEX IF NOT EXISTS diary_entries_created
  ON diary_entries (created_at DESC);

-- Row-level security (enable for production)
ALTER TABLE agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- Public read policy (collective diary is readable by all)
DROP POLICY IF EXISTS "public read agents" ON agents;
CREATE POLICY "public read agents"
  ON agents FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read diary_entries" ON diary_entries;
CREATE POLICY "public read diary_entries"
  ON diary_entries FOR SELECT USING (true);

-- Service role can write (API uses service role key)
DROP POLICY IF EXISTS "service role write agents" ON agents;
CREATE POLICY "service role write agents"
  ON agents FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role write diary_entries" ON diary_entries;
CREATE POLICY "service role write diary_entries"
  ON diary_entries FOR ALL USING (auth.role() = 'service_role');

-- Data API grants (required on new Supabase projects — tables are not auto-exposed)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.agents TO anon, authenticated;
GRANT SELECT ON TABLE public.diary_entries TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.agents TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.diary_entries TO service_role;

NOTIFY pgrst, 'reload schema';

-- Stage 1 MVP: 12 Rules content tables (shared DB `thebook`, public schema).
-- Safe: CREATE IF NOT EXISTS only; does not alter existing Bible/library tables.

CREATE TABLE IF NOT EXISTS twelverules_rules (
  id              SERIAL PRIMARY KEY,
  rule_number     INTEGER NOT NULL,
  title_original  TEXT NOT NULL,
  title_ua        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twelverules_rules_rule_number_key UNIQUE (rule_number),
  CONSTRAINT twelverules_rules_rule_number_range CHECK (rule_number >= 1 AND rule_number <= 12)
);

CREATE TABLE IF NOT EXISTS twelverules_chapters (
  id                 SERIAL PRIMARY KEY,
  rule_id            INTEGER NOT NULL REFERENCES twelverules_rules (id) ON DELETE CASCADE,
  chapter_number     INTEGER NOT NULL,
  title_original     TEXT NOT NULL,
  title_ua           TEXT,
  content_original   TEXT NOT NULL DEFAULT '',
  content_ua         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT twelverules_chapters_rule_chapter_key UNIQUE (rule_id, chapter_number),
  CONSTRAINT twelverules_chapters_chapter_number_positive CHECK (chapter_number >= 1)
);

CREATE INDEX IF NOT EXISTS twelverules_chapters_rule_id_idx
  ON twelverules_chapters (rule_id);

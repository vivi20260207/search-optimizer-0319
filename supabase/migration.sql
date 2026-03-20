-- ═══════════════════════════════════════════════════════════════
-- Search Optimizer 中台 — Supabase Schema Migration
-- 在 Supabase SQL Editor 中执行此脚本（一次性）
-- https://supabase.com/dashboard/project/lthetksmtttdsdygnicj/sql
-- ═══════════════════════════════════════════════════════════════

-- 1. 诊断备注（否定词诊断 + 根因分析）
--    支持软删除：deleted_at 非空 = 前端已删除但保留历史
CREATE TABLE IF NOT EXISTS diagnostic_notes (
  id          BIGSERIAL    PRIMARY KEY,
  note_type   TEXT         NOT NULL CHECK (note_type IN ('negkw', 'rca')),
  diag_id     TEXT         NOT NULL,
  content     TEXT         NOT NULL,
  role        TEXT         NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'system')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ  DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_diag_notes_active
  ON diagnostic_notes(note_type, diag_id)
  WHERE deleted_at IS NULL;

-- 2. 回传调整记录（纯文本，单行）
CREATE TABLE IF NOT EXISTS postback_log (
  id          BIGSERIAL    PRIMARY KEY,
  content     TEXT         NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO postback_log (content)
  SELECT '' WHERE NOT EXISTS (SELECT 1 FROM postback_log LIMIT 1);

-- 3. 用户设置（Gemini API Key、模型选择等）
CREATE TABLE IF NOT EXISTS user_settings (
  id          BIGSERIAL    PRIMARY KEY,
  key         TEXT         NOT NULL UNIQUE,
  value       TEXT         NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. ADW 数据快照（按天归档，Python 脚本写入）
CREATE TABLE IF NOT EXISTS adw_snapshots (
  id              BIGSERIAL    PRIMARY KEY,
  snapshot_date   DATE         NOT NULL,
  data_type       TEXT         NOT NULL,
  data            JSONB        NOT NULL DEFAULT '{}',
  record_count    INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(snapshot_date, data_type)
);

CREATE INDEX IF NOT EXISTS idx_adw_snapshots_lookup
  ON adw_snapshots(data_type, snapshot_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- 团队内部工具，允许 anon key 完全访问
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE diagnostic_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE postback_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE adw_snapshots    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_full_access" ON diagnostic_notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON postback_log     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON user_settings    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON adw_snapshots    FOR ALL TO anon USING (true) WITH CHECK (true);

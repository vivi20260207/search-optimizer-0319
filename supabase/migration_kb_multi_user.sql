-- ═══════════════════════════════════════════════════════════════
-- 知识库多优化师 + 评审流程 — Schema Migration
-- 在 Supabase SQL Editor 中执行此脚本（一次性）
-- https://supabase.com/dashboard/project/lthetksmtttdsdygnicj/sql
-- ═══════════════════════════════════════════════════════════════

-- 1. 给 knowledge_base 表加字段
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS owner       TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS scope       TEXT NOT NULL DEFAULT 'personal'
  CHECK (scope IN ('personal', 'team', 'product'));
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS product     TEXT
  CHECK (product IS NULL OR product IN ('ft', 'pu', 'ppt'));
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending_review'
  CHECK (status IN ('pending_review', 'approved', 'rejected'));
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 2. 把已有数据标记为 team（已存在的都是公共知识）+ approved
UPDATE knowledge_base
  SET scope = 'team', status = 'approved', owner = 'system'
  WHERE owner IS NULL;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_kb_scope_status ON knowledge_base(scope, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_owner        ON knowledge_base(owner) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kb_product      ON knowledge_base(product) WHERE deleted_at IS NULL AND product IS NOT NULL;

-- 4. 同样给 diagnostic_notes 加 owner（诊断备注按人隔离）
ALTER TABLE diagnostic_notes ADD COLUMN IF NOT EXISTS owner TEXT;

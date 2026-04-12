-- ============================================================
-- Migration 010: Add is_new flag for "New" badge on offerings
-- ============================================================

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT false;

-- Update RLS: allow public viewing of archived offerings (for catalog archive tab)
DROP POLICY IF EXISTS "Published offerings are public" ON offerings;
CREATE POLICY "Published and archived offerings are public"
  ON offerings FOR SELECT
  USING (status IN ('published', 'archived') OR get_user_role() = 'admin');

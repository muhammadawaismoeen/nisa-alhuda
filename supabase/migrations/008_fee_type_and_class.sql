-- ============================================================
-- Migration 008: Add fee_type column + 'class' offering type
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add 'class' to the offering_type enum
ALTER TYPE offering_type ADD VALUE IF NOT EXISTS 'class';

-- 2. Add fee_type column to offerings
ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS fee_type TEXT NOT NULL DEFAULT 'one_time'
  CHECK (fee_type IN ('one_time', 'monthly'));

-- 3. Update existing program "Noor Journey One" to monthly
UPDATE offerings SET fee_type = 'monthly' WHERE slug = 'noor-journey-one';

-- Also try old slug in case it wasn't updated
UPDATE offerings SET fee_type = 'monthly' WHERE slug = 'sisterhood-islamic-studies';

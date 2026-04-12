-- ============================================================
-- Migration 009: Add mode column to offerings (online/onsite)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'online'
  CHECK (mode IN ('online', 'onsite', 'hybrid'));

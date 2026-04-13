-- ============================================================
-- Migration 015: India (INR) pricing
-- - Adds offerings.price_inr (nullable). When set, the enrollment
--   wizard + offering page show the INR fee to students selecting
--   the 🇮🇳 India payment region instead of the PKR fee.
-- - Sets Noor Journey One: price_inr = 1000.
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Schema addition ───
ALTER TABLE offerings
    ADD COLUMN IF NOT EXISTS price_inr NUMERIC(10, 2);

-- ─── 2. Noor Journey One: India fee ───
UPDATE offerings
SET price_inr = 1000
WHERE slug = 'noor-journey-one';

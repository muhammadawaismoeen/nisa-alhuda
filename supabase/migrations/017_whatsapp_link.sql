-- ============================================================
-- Migration 017: Add WhatsApp group link to offerings
-- ============================================================
-- `whatsapp_link` stores the invite link to the offering's WhatsApp
-- group. When set, it's shown prominently at the top of the offering
-- page for enrolled students so everyone can find the group easily.

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

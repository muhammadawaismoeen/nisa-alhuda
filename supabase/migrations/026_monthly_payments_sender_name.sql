-- ============================================================
-- Migration 026: Add sender_name to monthly_payments
-- ============================================================
-- The dedicated monthly receipt page asks the sister for the name used
-- on her bank transfer (pre-filled from profile.full_name). Admin sees
-- it next to the receipt screenshot so she can match the bank
-- reference even when the sister sent via a relative's account.
--
-- Nullable + backward-compatible: existing rows stay valid; only new
-- submissions populate the column.

ALTER TABLE monthly_payments
    ADD COLUMN IF NOT EXISTS sender_name TEXT;

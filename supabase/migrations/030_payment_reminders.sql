-- ============================================================
-- Migration 030: Payment reminder tracking
-- ============================================================
-- Adds `reminded_at` to monthly_payments so the reminder cron can
-- stamp each row exactly once per cycle, preventing duplicate emails.
--
-- Also adds a SECURITY DEFINER helper that joins monthly_payments with
-- auth.users to retrieve student emails in a single query (the cron runs
-- under service role and needs emails that live in auth.users, not profiles).
-- ============================================================

-- 1. Add the timestamp column (idempotent via IF NOT EXISTS).
ALTER TABLE monthly_payments
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Partial index speeds up the cron's "find un-reminded owed rows" query.
CREATE INDEX IF NOT EXISTS monthly_payments_reminder_idx
  ON monthly_payments (cycle_month, status, reminded_at)
  WHERE status = 'owed' AND reminded_at IS NULL;

-- 3. Helper function — called by the payment-reminder cron (service role).
--    Returns all owed rows for the given cycle that have not yet been
--    reminded, with student email + name + offering title joined in.
--    SECURITY DEFINER so it can access auth.users from any role.
CREATE OR REPLACE FUNCTION public.get_owed_reminder_targets(p_cycle DATE)
RETURNS TABLE(
  payment_id    UUID,
  enrollment_id UUID,
  student_id    UUID,
  student_email TEXT,
  student_name  TEXT,
  offering_title TEXT,
  amount        NUMERIC,
  currency      TEXT
) AS $$
  SELECT
    mp.id              AS payment_id,
    mp.enrollment_id,
    mp.student_id,
    u.email            AS student_email,
    p.full_name        AS student_name,
    o.title            AS offering_title,
    mp.amount,
    mp.currency
  FROM public.monthly_payments mp
  JOIN auth.users      u ON u.id  = mp.student_id
  JOIN public.profiles p ON p.id  = mp.student_id
  JOIN public.offerings o ON o.id = mp.offering_id
  WHERE mp.cycle_month  = p_cycle
    AND mp.status       = 'owed'
    AND mp.reminded_at  IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

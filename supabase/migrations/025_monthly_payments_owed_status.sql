-- ============================================================
-- Migration 025: Add 'owed' status for proactively-created monthly cycles
-- ============================================================
-- Phase-1 of the recurring-payment plan: a daily cron creates a placeholder
-- monthly_payments row on the first day of each new cycle for every active
-- monthly enrollment, so the dashboard / payment ledger can show "this cycle
-- is owed but the sister hasn't submitted a receipt yet" — distinct from
-- 'pending' (receipt uploaded, awaiting admin review).
--
-- Lifecycle:
--   owed     ─ created by cron, no receipt yet
--   pending  ─ student uploaded a receipt, awaiting admin/treasurer review
--   approved ─ admin/treasurer accepted
--   rejected ─ admin/treasurer rejected with a reason; student can re-upload
--
-- This migration is purely additive — existing rows stay valid.

-- 1. Expand the status CHECK constraint to allow 'owed'.
--    Postgres requires dropping + recreating the constraint to widen it.
ALTER TABLE monthly_payments
    DROP CONSTRAINT IF EXISTS monthly_payments_status_check;

ALTER TABLE monthly_payments
    ADD CONSTRAINT monthly_payments_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'owed'));

-- 2. Let students upload a receipt against their own 'owed' placeholder row
--    (transitioning it to 'pending'). The previous policy only allowed UPDATE
--    on 'pending' rows, which would have blocked the very first upload after
--    the cron created a placeholder.
DROP POLICY IF EXISTS "Students update own pending monthly payments" ON monthly_payments;
CREATE POLICY "Students update own pending monthly payments"
    ON monthly_payments FOR UPDATE
    USING (
        student_id = auth.uid()
        AND status IN ('pending', 'owed')
    )
    WITH CHECK (student_id = auth.uid());

-- ============================================================
-- Migration 013: Financial Assistance
-- Adds FA request/approval fields to the enrollments table.
-- Students can request reduced fees with a reason + income range.
-- Admins review and approve (custom amount) or reject.
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Add FA columns to enrollments ───
ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS fa_requested        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS fa_reason           TEXT,
    ADD COLUMN IF NOT EXISTS fa_income_range     TEXT,
    ADD COLUMN IF NOT EXISTS fa_offered_amount   INTEGER,     -- what student offered to pay
    ADD COLUMN IF NOT EXISTS fa_approved_amount  INTEGER,     -- admin-approved amount (0 = waiver)
    ADD COLUMN IF NOT EXISTS fa_decision_note    TEXT,        -- admin's internal note
    ADD COLUMN IF NOT EXISTS fa_reviewed_at      TIMESTAMPTZ;

-- ─── 2. Index for quick filtering of FA requests ───
CREATE INDEX IF NOT EXISTS idx_enrollments_fa_pending
    ON enrollments(fa_requested)
    WHERE fa_requested = true AND fa_approved_amount IS NULL AND status = 'pending';

-- ─── 3. Update notification trigger to handle FA approvals ───
-- When fa_approved_amount is set (not NULL), notify the student
CREATE OR REPLACE FUNCTION notify_fa_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offering_title TEXT;
BEGIN
    -- Only fire when fa_approved_amount goes from NULL to a value
    IF OLD.fa_approved_amount IS NOT NULL THEN RETURN NEW; END IF;
    IF NEW.fa_approved_amount IS NULL THEN RETURN NEW; END IF;
    -- Skip if no linked student account (shouldn't happen for FA, but safety)
    IF NEW.student_id IS NULL THEN RETURN NEW; END IF;

    SELECT title INTO offering_title FROM offerings WHERE id = NEW.offering_id;

    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
        NEW.student_id,
        'fa_approved',
        'Financial Assistance Approved',
        CASE
            WHEN NEW.fa_approved_amount = 0
                THEN 'Your financial assistance for "' || COALESCE(offering_title, 'a course') || '" has been approved with a full waiver. You are now enrolled!'
            ELSE
                'Your financial assistance for "' || COALESCE(offering_title, 'a course') || '" has been approved. Please proceed to pay the reduced fee.'
        END,
        '/dashboard/student/enrollments',
        jsonb_build_object(
            'offering_id', NEW.offering_id,
            'enrollment_id', NEW.id,
            'fa_approved_amount', NEW.fa_approved_amount
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_decision_notify ON enrollments;
CREATE TRIGGER trg_fa_decision_notify
    AFTER UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION notify_fa_decision();

-- Done.

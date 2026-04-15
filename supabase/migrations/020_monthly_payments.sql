-- ============================================================
-- Migration 020: Monthly payment cycle tracking
-- ============================================================
-- Adds a `monthly_payments` table so enrolled students on monthly-fee
-- offerings can upload a new receipt each month and admins/treasurers
-- can approve or reject each cycle independently. One row per
-- (enrollment, cycle_month). The initial enrollment payment remains on
-- `enrollments` — this table only tracks ongoing months.
--
-- cycle_month is always the first day of the month (2026-04-01, not
-- 2026-04-15) so (enrollment_id, cycle_month) makes a clean unique key.

CREATE TABLE IF NOT EXISTS monthly_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,

    -- Cycle this payment covers — always the 1st of the month
    cycle_month DATE NOT NULL,

    -- Payment details (mirrors the enrollment payment columns)
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR',
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
    receipt_url TEXT,

    -- Review state
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (enrollment_id, cycle_month)
);

-- Helpful indexes for the common queries
CREATE INDEX IF NOT EXISTS monthly_payments_student_idx
    ON monthly_payments (student_id);
CREATE INDEX IF NOT EXISTS monthly_payments_offering_idx
    ON monthly_payments (offering_id);
CREATE INDEX IF NOT EXISTS monthly_payments_status_idx
    ON monthly_payments (status);
CREATE INDEX IF NOT EXISTS monthly_payments_cycle_idx
    ON monthly_payments (cycle_month);

-- Keep updated_at fresh on every row update
CREATE OR REPLACE FUNCTION touch_monthly_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monthly_payments_touch_updated_at ON monthly_payments;
CREATE TRIGGER monthly_payments_touch_updated_at
    BEFORE UPDATE ON monthly_payments
    FOR EACH ROW EXECUTE FUNCTION touch_monthly_payments_updated_at();

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE monthly_payments ENABLE ROW LEVEL SECURITY;

-- Students see only their own monthly payments
DROP POLICY IF EXISTS "Students read own monthly payments" ON monthly_payments;
CREATE POLICY "Students read own monthly payments"
    ON monthly_payments FOR SELECT
    USING (student_id = auth.uid());

-- Students can create/update their own monthly payments (only while pending,
-- so they can replace a receipt before review). Once reviewed, the row is
-- treated as closed — any further changes must be done by admin/treasurer.
DROP POLICY IF EXISTS "Students insert own monthly payments" ON monthly_payments;
CREATE POLICY "Students insert own monthly payments"
    ON monthly_payments FOR INSERT
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students update own pending monthly payments" ON monthly_payments;
CREATE POLICY "Students update own pending monthly payments"
    ON monthly_payments FOR UPDATE
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

-- Admins and treasurers get full read + update (for review)
DROP POLICY IF EXISTS "Admins read all monthly payments" ON monthly_payments;
CREATE POLICY "Admins read all monthly payments"
    ON monthly_payments FOR SELECT
    USING (get_user_role() IN ('admin', 'treasurer'));

DROP POLICY IF EXISTS "Admins update monthly payments" ON monthly_payments;
CREATE POLICY "Admins update monthly payments"
    ON monthly_payments FOR UPDATE
    USING (get_user_role() IN ('admin', 'treasurer'))
    WITH CHECK (get_user_role() IN ('admin', 'treasurer'));

-- Also let instructors see monthly payment status for their own offerings
-- (read-only — they don't approve payments, they just need visibility on
-- who has paid for the current month).
DROP POLICY IF EXISTS "Instructors read monthly payments for their offerings" ON monthly_payments;
CREATE POLICY "Instructors read monthly payments for their offerings"
    ON monthly_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM offerings o
            WHERE o.id = monthly_payments.offering_id
              AND o.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.offering_id = monthly_payments.offering_id
              AND s.instructor_id = auth.uid()
        )
    );

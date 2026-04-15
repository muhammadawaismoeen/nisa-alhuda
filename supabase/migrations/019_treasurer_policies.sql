-- ============================================================
-- Migration 019: Treasurer RLS policies
-- ============================================================
-- Parallel RLS policies for the treasurer role (added in migration 018).
-- The existing `get_user_role() = 'admin'` policies don't cover treasurers,
-- so we add treasurer-scoped policies: read enrollments/offerings/profiles,
-- and update enrollments (to approve/reject payments).
--
-- Kept in a separate migration so the ALTER TYPE in 018 can commit first —
-- Postgres forbids using a newly-added enum value in the same transaction.

-- Allow treasurers to read all enrollments (for the payment queue)
DROP POLICY IF EXISTS "Treasurers can read all enrollments" ON enrollments;
CREATE POLICY "Treasurers can read all enrollments"
    ON enrollments FOR SELECT
    USING (get_user_role() = 'treasurer');

-- Allow treasurers to update enrollments (approving/rejecting payments)
DROP POLICY IF EXISTS "Treasurers can update enrollments" ON enrollments;
CREATE POLICY "Treasurers can update enrollments"
    ON enrollments FOR UPDATE
    USING (get_user_role() = 'treasurer')
    WITH CHECK (get_user_role() = 'treasurer');

-- Treasurers also need to see offerings and profile info to render the
-- payment queue page (names, offering titles).
DROP POLICY IF EXISTS "Treasurers can read offerings" ON offerings;
CREATE POLICY "Treasurers can read offerings"
    ON offerings FOR SELECT
    USING (get_user_role() = 'treasurer');

DROP POLICY IF EXISTS "Treasurers can read profiles" ON profiles;
CREATE POLICY "Treasurers can read profiles"
    ON profiles FOR SELECT
    USING (get_user_role() = 'treasurer');

-- ============================================================
-- Migration 028: Instructor gets admin-equivalent powers (minus billing)
-- ============================================================
-- Teachers asked for a single shared portal: same screens as admin,
-- same ability to manage courses, subjects, enrollments and users —
-- except they MUST NOT see or touch any billing/payment data.
--
-- Scope of this migration is RLS only. Server-action role checks
-- and UI hiding are handled at the application layer (see
-- src/app/dashboard/**/*.{ts,tsx}).
--
-- Tables broadened to admin OR instructor:
--   * profiles UPDATE  (so instructor can manage users)
--   * offerings INSERT / UPDATE / DELETE
--   * subjects  INSERT / UPDATE / DELETE
--   * enrollments SELECT / UPDATE  (review and approval)
--
-- Tables intentionally NOT touched (kept admin-only or admin+treasurer):
--   * monthly_payments — billing data, admin + treasurer only (mig 020)
--   * enrollments.payment_* columns — column-level hiding handled in
--     the UI via the helper `isInstructorRoleOnly()`; RLS stays
--     row-level open so the same query can serve both audiences.
--
-- Uses `has_role()` from migration 022 so the policy fires for users
-- who hold the role in either the primary `role` column or the
-- additional `roles[]` array.

-- ─── PROFILES ─────────────────────────────────────────────
-- Drop the existing admin-only UPDATE policy and replace it with a
-- broader admin-OR-instructor check. The "Users can update own
-- profile" policy is untouched — it always coexists with the staff
-- policy via OR semantics.
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Staff can update any profile"
    ON profiles FOR UPDATE
    USING (has_role('admin') OR has_role('instructor'));

-- ─── OFFERINGS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Published offerings are public" ON offerings;
CREATE POLICY "Published offerings are public"
    ON offerings FOR SELECT
    USING (
        status = 'published'
        OR has_role('admin')
        OR has_role('instructor')
    );

DROP POLICY IF EXISTS "Admins can insert offerings" ON offerings;
CREATE POLICY "Staff can insert offerings"
    ON offerings FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('instructor'));

DROP POLICY IF EXISTS "Admins can update offerings" ON offerings;
CREATE POLICY "Staff can update offerings"
    ON offerings FOR UPDATE
    USING (has_role('admin') OR has_role('instructor'));

DROP POLICY IF EXISTS "Admins can delete offerings" ON offerings;
CREATE POLICY "Staff can delete offerings"
    ON offerings FOR DELETE
    USING (has_role('admin') OR has_role('instructor'));

-- ─── SUBJECTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Subjects of published offerings are public" ON subjects;
CREATE POLICY "Subjects of published offerings are public"
    ON subjects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = subjects.offering_id
              AND (
                  offerings.status = 'published'
                  OR has_role('admin')
                  OR has_role('instructor')
              )
        )
    );

DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
CREATE POLICY "Staff can insert subjects"
    ON subjects FOR INSERT
    WITH CHECK (has_role('admin') OR has_role('instructor'));

DROP POLICY IF EXISTS "Admins can update subjects" ON subjects;
CREATE POLICY "Staff can update subjects"
    ON subjects FOR UPDATE
    USING (has_role('admin') OR has_role('instructor'));

DROP POLICY IF EXISTS "Admins can delete subjects" ON subjects;
CREATE POLICY "Staff can delete subjects"
    ON subjects FOR DELETE
    USING (has_role('admin') OR has_role('instructor'));

-- ─── ENROLLMENTS ──────────────────────────────────────────
-- Instructors review and approve enrollments. Visibility broadens
-- to all enrollments (not just their own offerings) because the
-- workflow is shared with admin — same list, same buttons. Payment
-- columns stay row-visible but the UI hides them for instructors.
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
CREATE POLICY "Users and staff can view enrollments"
    ON enrollments FOR SELECT
    USING (
        student_id = auth.uid()
        OR has_role('admin')
        OR has_role('instructor')
    );

DROP POLICY IF EXISTS "Admins can update enrollments" ON enrollments;
CREATE POLICY "Staff can update enrollments"
    ON enrollments FOR UPDATE
    USING (has_role('admin') OR has_role('instructor'));

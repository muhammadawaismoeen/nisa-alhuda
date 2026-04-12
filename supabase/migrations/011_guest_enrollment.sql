-- ============================================================
-- Migration 011: Guest Enrollment — allow enrollment without login
-- ============================================================
-- Changes:
--   1. Make student_id nullable (guest won't have one yet)
--   2. Add applicant_email to identify enrollments
--   3. Make payment_receipt_url nullable (free offerings skip payment)
--   4. Add must_change_password flag to profiles
--   5. Update unique constraint to use email + offering
--   6. Backfill applicant_email from auth.users for existing enrollments

-- 1. Make student_id nullable for guest enrollments
ALTER TABLE enrollments ALTER COLUMN student_id DROP NOT NULL;

-- 2. Add applicant_email column (nullable initially for backfill)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS applicant_email TEXT;

-- 3. Make payment_receipt_url nullable for free offerings
ALTER TABLE enrollments ALTER COLUMN payment_receipt_url DROP NOT NULL;

-- 4. Add must_change_password to profiles (for first-login password change)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- 5. Backfill applicant_email from auth.users for existing enrollments
UPDATE enrollments e
SET applicant_email = u.email
FROM auth.users u
WHERE u.id = e.student_id
  AND e.applicant_email IS NULL;

-- 6. Now make applicant_email NOT NULL
ALTER TABLE enrollments ALTER COLUMN applicant_email SET NOT NULL;

-- 7. Drop old unique constraint (student_id + offering_id)
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_offering_id_key;

-- 8. Add new unique constraint (email + offering_id)
ALTER TABLE enrollments ADD CONSTRAINT enrollments_email_offering_unique
  UNIQUE (applicant_email, offering_id);

-- 9. RLS: The existing INSERT policy (auth.uid() = student_id) still works for
-- logged-in users. Guest inserts use service_role which bypasses RLS entirely.
-- No policy changes needed for INSERT.

-- 10. Update SELECT policy to also allow instructors to see enrollments
-- (already handled by migration 003, no change needed)

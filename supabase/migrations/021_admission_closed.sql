-- ============================================================
-- Migration 021: Admission Closed toggle for offerings
-- ============================================================
-- Adds a boolean column `admission_closed` so admins can close
-- enrollment for any offering while keeping it publicly visible.
-- When true, the "Enroll Now" button is replaced with
-- "Admission Closed!" and the enrollment page blocks new signups.

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS admission_closed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN offerings.admission_closed IS
  'When true, new enrollments are blocked and an "Admission Closed!" label is shown on the public page.';

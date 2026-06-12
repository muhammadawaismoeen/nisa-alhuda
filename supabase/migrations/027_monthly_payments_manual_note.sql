-- ============================================================
-- Migration 027: Manual-approval note column for monthly_payments
-- ============================================================
-- Adds a free-text `manual_note` so admin can record WHY a cycle was
-- approved without a receipt (e.g. "paid cash in person", "JazzCash
-- transfer", "partial paid 600 of 1500"). Distinct from
-- `rejection_reason` (admin-facing audit trail vs. sister-facing
-- explanation).
--
-- Manual approvals are written with payment_method = 'admin_recorded'
-- so they can be distinguished from sister-uploaded receipts in
-- reports. payment_method is a plain TEXT column (not an enum) so no
-- type change is needed — the new value just appears in new rows.
--
-- Behavior: a manually-approved row sets status='approved',
-- payment_method='admin_recorded', receipt_url=NULL, reviewed_by/at
-- to the admin who clicked Approve, and manual_note to whatever they
-- typed. Future cycles continue to bill normally (this is a one-time
-- override, not a switch to offline-billing).

ALTER TABLE monthly_payments
    ADD COLUMN IF NOT EXISTS manual_note TEXT;

COMMENT ON COLUMN monthly_payments.manual_note IS
  'Free-text note recorded when admin approves a cycle without a receipt (payment_method=admin_recorded). Audit trail only — never shown to the sister.';

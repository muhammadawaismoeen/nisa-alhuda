-- ============================================================
-- Migration 018: Treasurer role (enum value only)
-- ============================================================
-- Adds a `treasurer` value to the user_role enum. Treasurers can review
-- and approve/reject payment receipts, but they cannot access other
-- admin tools (offerings, users, analytics, etc). This lets the two
-- people holding the bank accounts keep the payment ledger up to date
-- without granting them full admin access.
--
-- NOTE: Postgres forbids using a new enum value in the same transaction
-- that added it. The RLS policies that reference 'treasurer' live in a
-- separate migration (019_treasurer_policies.sql) so this one can commit
-- first.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'treasurer';

-- ============================================================
-- Migration 022: Multi-role support
-- ============================================================
-- Adds a `roles user_role[]` array column to profiles so a single
-- user can hold multiple roles (e.g. an instructor who is also a
-- treasurer). The existing `role` column is kept as the PRIMARY role
-- and continues to drive:
--   * landing dashboard after login (student/instructor/admin)
--   * all existing RLS policies (get_user_role() unchanged)
--
-- The new `roles[]` column is additive — feature access can check
-- `has_role('admin')` which returns true if admin is in either the
-- primary `role` or the `roles[]` array. This lets us grant capabilities
-- without breaking the existing 20+ RLS policies that key off `role`.
--
-- Backfill: every existing profile gets `roles = ARRAY[role]` so the
-- invariant "primary role is always present in roles[]" holds from day 1.

-- 1. Add the array column, defaulting to an empty array for safety.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles user_role[] NOT NULL DEFAULT ARRAY[]::user_role[];

-- 2. Backfill: mirror the current primary role into the array.
UPDATE public.profiles
  SET roles = ARRAY[role]::user_role[]
  WHERE array_length(roles, 1) IS NULL;

-- 3. Helper function for feature-access checks.
--    Returns true if the current user holds `target` as primary OR in roles[].
CREATE OR REPLACE FUNCTION public.has_role(target user_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (role = target OR target = ANY(roles))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.has_role(user_role) IS
  'True if the current auth user holds the given role either as primary (profiles.role) or as an additional role (profiles.roles[]). Use in RLS and server guards when a feature should be accessible via any granted role.';

-- 4. Trigger: keep the invariant that primary role is always in roles[].
--    If an admin updates `role` without touching `roles`, auto-include it.
CREATE OR REPLACE FUNCTION public.sync_primary_role_into_roles()
RETURNS trigger AS $$
BEGIN
  IF NEW.role IS NOT NULL AND NOT (NEW.role = ANY(NEW.roles)) THEN
    NEW.roles := array_append(NEW.roles, NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_primary_role_into_roles ON public.profiles;
CREATE TRIGGER trg_sync_primary_role_into_roles
  BEFORE INSERT OR UPDATE OF role, roles ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_role_into_roles();

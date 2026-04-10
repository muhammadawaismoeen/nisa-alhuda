-- ============================================================
-- Migration 004: Admin features — featured offerings, user suspension
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add is_featured flag to offerings for homepage featuring
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Add is_suspended flag to profiles for banning/suspending users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- Allow admins to delete enrollments (for manual removal)
CREATE POLICY "Admins can delete enrollments"
    ON enrollments FOR DELETE
    USING (get_user_role() = 'admin');

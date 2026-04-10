-- ============================================================
-- Migration 002: Add student_details to enrollments
-- Stores intake form data (name, phone, city, etc.) as JSONB
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE enrollments
ADD COLUMN student_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN enrollments.student_details IS
  'Intake form data: full_name, phone, city, age, education_level, referral_source, message';

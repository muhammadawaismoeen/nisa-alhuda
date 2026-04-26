-- 023: Auto-link guest enrollments to a user on signup.
--
-- Problem: when a student enrolls as a guest (applicant_email set,
-- student_id NULL), then later signs up using the same email, their
-- enrollment row is never linked to their auth.users id. The student
-- dashboard filters by enrollments.student_id, so they see "No
-- enrollments yet" forever even though they're approved in the DB.
--
-- Fix: extend handle_new_user() to also UPDATE every enrollment whose
-- applicant_email matches the new user's email and has student_id NULL.
-- This is idempotent and runs only at the moment of user creation, so
-- it has zero ongoing query cost.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Existing behavior: create the matching profile row.
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'avatar_url'
    );

    -- New behavior: link any orphaned guest enrollments. We compare on
    -- LOWER(email) so casing differences between the wizard email entry
    -- and the auth-user email don't strand the enrollment a second time.
    UPDATE public.enrollments
    SET student_id = NEW.id
    WHERE student_id IS NULL
      AND LOWER(applicant_email) = LOWER(NEW.email);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

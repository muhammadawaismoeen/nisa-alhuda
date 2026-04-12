-- ============================================================
-- Migration 012: Fix notification trigger for guest enrollments
-- Guest enrollments have student_id = NULL, which crashes the
-- notification INSERT (user_id NOT NULL). Skip notification for guests.
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE OR REPLACE FUNCTION notify_enrollment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offering_title TEXT;
BEGIN
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;
    IF NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;

    -- Skip notification for guest enrollments (no linked user account yet)
    IF NEW.student_id IS NULL THEN RETURN NEW; END IF;

    SELECT title INTO offering_title FROM offerings WHERE id = NEW.offering_id;

    INSERT INTO notifications (user_id, type, title, body, link, metadata)
    VALUES (
        NEW.student_id,
        CASE WHEN NEW.status = 'approved' THEN 'enrollment_approved' ELSE 'enrollment_rejected' END,
        CASE WHEN NEW.status = 'approved'
            THEN 'Enrollment Approved!'
            ELSE 'Enrollment Update'
        END,
        CASE WHEN NEW.status = 'approved'
            THEN 'Your enrollment in "' || COALESCE(offering_title, 'a course') || '" has been approved. You can now start learning!'
            ELSE 'Your enrollment in "' || COALESCE(offering_title, 'a course') || '" was not approved.' ||
                 CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END
        END,
        CASE WHEN NEW.status = 'approved'
            THEN '/dashboard/student/offerings/' || NEW.offering_id
            ELSE '/dashboard/student/enrollments'
        END,
        jsonb_build_object('offering_id', NEW.offering_id, 'enrollment_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

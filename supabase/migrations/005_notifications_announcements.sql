-- ============================================================
-- Migration 005: Notifications & Announcements
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── Notifications Table ───
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'general',
    title       TEXT NOT NULL,
    body        TEXT,
    link        TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read, created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can delete notifications"
    ON notifications FOR DELETE
    USING (get_user_role() = 'admin');

-- ─── Announcements Table ───
CREATE TABLE IF NOT EXISTS announcements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID NOT NULL REFERENCES profiles(id),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    offering_id UUID REFERENCES offerings(id) ON DELETE CASCADE,
    is_pinned   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_offering
    ON announcements(offering_id, created_at DESC);

-- RLS for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read announcements"
    ON announcements FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and instructors can create announcements"
    ON announcements FOR INSERT
    WITH CHECK (get_user_role() IN ('admin', 'instructor'));

CREATE POLICY "Authors and admins can update announcements"
    ON announcements FOR UPDATE
    USING (author_id = auth.uid() OR get_user_role() = 'admin');

CREATE POLICY "Authors and admins can delete announcements"
    ON announcements FOR DELETE
    USING (author_id = auth.uid() OR get_user_role() = 'admin');

-- ─── Trigger: Auto-notify on enrollment status change ───
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

DROP TRIGGER IF EXISTS trg_enrollment_status_notify ON enrollments;
CREATE TRIGGER trg_enrollment_status_notify
    AFTER UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION notify_enrollment_status_change();

-- ─── Trigger: Auto-notify on new announcement ───
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user RECORD;
BEGIN
    IF NEW.offering_id IS NULL THEN
        -- Global announcement → notify all users except the author
        FOR target_user IN
            SELECT id FROM profiles WHERE id != NEW.author_id
        LOOP
            INSERT INTO notifications (user_id, type, title, body, link, metadata)
            VALUES (
                target_user.id,
                'new_announcement',
                'New Announcement: ' || NEW.title,
                LEFT(NEW.body, 200),
                '/dashboard/announcements',
                jsonb_build_object('announcement_id', NEW.id)
            );
        END LOOP;
    ELSE
        -- Scoped to offering → notify enrolled students
        FOR target_user IN
            SELECT DISTINCT student_id AS id FROM enrollments
            WHERE offering_id = NEW.offering_id AND status = 'approved' AND student_id != NEW.author_id
        LOOP
            INSERT INTO notifications (user_id, type, title, body, link, metadata)
            VALUES (
                target_user.id,
                'new_announcement',
                'New Announcement: ' || NEW.title,
                LEFT(NEW.body, 200),
                '/dashboard/announcements',
                jsonb_build_object('announcement_id', NEW.id, 'offering_id', NEW.offering_id)
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_announcement_notify ON announcements;
CREATE TRIGGER trg_new_announcement_notify
    AFTER INSERT ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_announcement();

-- ─── Enable Realtime for notifications ───
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

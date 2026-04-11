-- ============================================================
-- Migration 006: Lesson Progress Tracking
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── Lesson Progress Table ───
CREATE TABLE IF NOT EXISTS lesson_progress (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_offering
    ON lesson_progress(student_id, offering_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_offering
    ON lesson_progress(offering_id);

-- RLS for lesson_progress
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
    ON lesson_progress FOR SELECT
    USING (student_id = auth.uid());

-- Students can mark lessons complete (only if enrolled)
CREATE POLICY "Students can insert own progress"
    ON lesson_progress FOR INSERT
    WITH CHECK (
        auth.uid() = student_id
        AND is_enrolled(offering_id)
    );

-- Students can un-mark lessons
CREATE POLICY "Students can delete own progress"
    ON lesson_progress FOR DELETE
    USING (student_id = auth.uid());

-- Instructors can view progress for their offerings
CREATE POLICY "Instructors can view student progress"
    ON lesson_progress FOR SELECT
    USING (
        get_user_role() = 'instructor'
        AND offering_id IN (
            SELECT DISTINCT s.offering_id
            FROM subjects s
            WHERE s.instructor_id = auth.uid()
        )
    );

-- Admins can view all progress
CREATE POLICY "Admins can view all progress"
    ON lesson_progress FOR SELECT
    USING (get_user_role() = 'admin');

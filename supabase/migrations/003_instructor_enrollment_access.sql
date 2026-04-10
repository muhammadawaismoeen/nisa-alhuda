-- ============================================================
-- Migration 003: Allow instructors to view enrollments
-- for offerings that contain their assigned subjects.
-- Also allow instructors to delete their own lessons.
--
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Instructors can view enrollments for offerings they teach in
CREATE POLICY "Instructors can view enrollments for their offerings"
    ON enrollments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.offering_id = enrollments.offering_id
              AND subjects.instructor_id = auth.uid()
        )
    );

-- Instructors can delete their own lessons (currently only admins can)
CREATE POLICY "Instructors can delete own lessons"
    ON lessons FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.id = lessons.subject_id
              AND subjects.instructor_id = auth.uid()
        )
    );

-- Instructors can delete resources for their lessons
CREATE POLICY "Instructors can delete own resources"
    ON resources FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM lessons
            JOIN subjects ON subjects.id = lessons.subject_id
            WHERE lessons.id = resources.lesson_id
              AND subjects.instructor_id = auth.uid()
        )
    );

-- Allow instructors to delete from resources storage bucket
CREATE POLICY "Instructors can delete resources from storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'resources'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
            AND role IN ('instructor', 'admin')
        )
    );

-- ============================================================
-- Migration 007: Live Sessions
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── Live Sessions Table ───
CREATE TABLE IF NOT EXISTS live_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    offering_id     UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    meeting_url     TEXT NOT NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_live_sessions_instructor
    ON live_sessions(instructor_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_offering
    ON live_sessions(offering_id);

CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled
    ON live_sessions(scheduled_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_live_sessions_updated_at
    BEFORE UPDATE ON live_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ───
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Instructors can manage their own sessions
CREATE POLICY "Instructors can view own sessions"
    ON live_sessions FOR SELECT
    USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can create sessions"
    ON live_sessions FOR INSERT
    WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Instructors can update own sessions"
    ON live_sessions FOR UPDATE
    USING (instructor_id = auth.uid());

CREATE POLICY "Instructors can delete own sessions"
    ON live_sessions FOR DELETE
    USING (instructor_id = auth.uid());

-- Students can view sessions for offerings they are enrolled in
CREATE POLICY "Students can view sessions for enrolled offerings"
    ON live_sessions FOR SELECT
    USING (
        is_enrolled(offering_id)
    );

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
    ON live_sessions FOR SELECT
    USING (get_user_role() = 'admin');

-- Admins can manage all sessions
CREATE POLICY "Admins can manage all sessions"
    ON live_sessions FOR ALL
    USING (get_user_role() = 'admin');

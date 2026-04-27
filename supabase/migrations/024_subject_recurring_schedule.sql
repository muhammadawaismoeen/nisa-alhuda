-- 024: Per-subject recurring class schedule.
--
-- Lets admins set a class's day-of-week + time + meeting URL ONCE per
-- subject instead of creating a fresh `lessons` row for every weekly
-- session. Student / instructor dashboards render the recurring entry
-- as a permanent "Join Live" card; individual `lessons` rows are still
-- used for date-specific recordings + supplementary content.
--
-- All three columns are nullable. Subjects without a recurring schedule
-- continue to behave as before (admin creates per-class lessons).

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS recurring_meeting_url TEXT,
    ADD COLUMN IF NOT EXISTS recurring_schedule_label TEXT,
    ADD COLUMN IF NOT EXISTS recurring_day_of_week SMALLINT
        CHECK (recurring_day_of_week IS NULL OR (recurring_day_of_week >= 0 AND recurring_day_of_week <= 6)),
    ADD COLUMN IF NOT EXISTS recurring_start_time TIME,
    ADD COLUMN IF NOT EXISTS recurring_duration_minutes INTEGER DEFAULT 60;

-- Note on day_of_week values: 0 = Sunday, 1 = Monday, … 6 = Saturday.
-- Same convention as JavaScript Date.getDay() so the UI doesn't have to
-- translate.

COMMENT ON COLUMN subjects.recurring_meeting_url IS
  'Stable Zoom/Meet URL reused for every weekly class of this subject.';
COMMENT ON COLUMN subjects.recurring_schedule_label IS
  'Free-text human label, e.g. "Mondays 6–7 PM PKT". Shown to students.';
COMMENT ON COLUMN subjects.recurring_day_of_week IS
  '0=Sun, 1=Mon, ..., 6=Sat. Lets the UI compute "next class" timestamp.';
COMMENT ON COLUMN subjects.recurring_start_time IS
  'Local-time start of the recurring class, e.g. 18:00:00.';
COMMENT ON COLUMN subjects.recurring_duration_minutes IS
  'Class duration; defaults to 60. Used for "live now" detection.';

-- ============================================================
-- Nisa Al-Huda: Initial Database Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE offering_type AS ENUM ('program', 'course', 'workshop');
CREATE TYPE offering_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected');


-- ─── 1. PROFILES ────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields

CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    avatar_url  TEXT,
    role        user_role NOT NULL DEFAULT 'student',
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── 2. OFFERINGS ───────────────────────────────────────────

CREATE TABLE offerings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL UNIQUE,
    description       TEXT NOT NULL,
    short_description TEXT,
    type              offering_type NOT NULL,
    price             INTEGER NOT NULL DEFAULT 0,
    thumbnail_url     TEXT,
    status            offering_status NOT NULL DEFAULT 'draft',
    instructor_id     UUID REFERENCES profiles(id),
    schedule_start    DATE,
    schedule_end      DATE,
    live_class_link   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER offerings_updated_at
    BEFORE UPDATE ON offerings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── 3. SUBJECTS ────────────────────────────────────────────

CREATE TABLE subjects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id   UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    slug          TEXT NOT NULL,
    description   TEXT,
    instructor_id UUID NOT NULL REFERENCES profiles(id),
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(offering_id, slug)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── 4. LESSONS ─────────────────────────────────────────────

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id     UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    subject_id      UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    scheduled_at    TIMESTAMPTZ,
    live_class_link TEXT,
    recording_url   TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_published    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── 5. RESOURCES ───────────────────────────────────────────

CREATE TABLE resources (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    file_url   TEXT NOT NULL,
    file_type  TEXT NOT NULL,
    file_size  BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;


-- ─── 6. ENROLLMENTS ────────────────────────────────────────

CREATE TABLE enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id          UUID NOT NULL REFERENCES profiles(id),
    offering_id         UUID NOT NULL REFERENCES offerings(id),
    status              enrollment_status NOT NULL DEFAULT 'pending',
    payment_receipt_url TEXT NOT NULL,
    payment_amount      INTEGER NOT NULL,
    payment_method      TEXT NOT NULL DEFAULT 'bank_transfer',
    rejection_reason    TEXT,
    reviewed_by         UUID REFERENCES profiles(id),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, offering_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER enrollments_updated_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── 7. CHAT ROOMS ─────────────────────────────────────────

CREATE TABLE chat_rooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
    subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;


-- ─── 8. CHAT MESSAGES ──────────────────────────────────────

CREATE TABLE chat_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES profiles(id),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Performance index: queries always filter by room + sort by time
CREATE INDEX idx_chat_messages_room_created
    ON chat_messages(room_id, created_at DESC);


-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is enrolled in an offering
CREATE OR REPLACE FUNCTION public.is_enrolled(p_offering_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = auth.uid()
          AND offering_id = p_offering_id
          AND status = 'approved'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ─── PROFILES POLICIES ─────────────────────────────────────

-- Anyone can view profiles (needed for displaying instructor names, etc.)
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g., changing roles)
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (get_user_role() = 'admin');


-- ─── OFFERINGS POLICIES ────────────────────────────────────

-- Published offerings are visible to everyone (public catalog)
CREATE POLICY "Published offerings are public"
    ON offerings FOR SELECT
    USING (status = 'published' OR get_user_role() = 'admin');

-- Only admins can create/update/delete offerings
CREATE POLICY "Admins can insert offerings"
    ON offerings FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update offerings"
    ON offerings FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete offerings"
    ON offerings FOR DELETE
    USING (get_user_role() = 'admin');


-- ─── SUBJECTS POLICIES ─────────────────────────────────────

-- Subjects of published offerings are visible to everyone
CREATE POLICY "Subjects of published offerings are public"
    ON subjects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = subjects.offering_id
              AND (offerings.status = 'published' OR get_user_role() = 'admin')
        )
    );

CREATE POLICY "Admins can insert subjects"
    ON subjects FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update subjects"
    ON subjects FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete subjects"
    ON subjects FOR DELETE
    USING (get_user_role() = 'admin');


-- ─── LESSONS POLICIES ──────────────────────────────────────

-- Enrolled students + assigned instructors + admins can view lessons
CREATE POLICY "Enrolled users can view lessons"
    ON lessons FOR SELECT
    USING (
        is_enrolled(offering_id)
        OR get_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.id = lessons.subject_id
              AND subjects.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = lessons.offering_id
              AND offerings.instructor_id = auth.uid()
        )
    );

-- Instructors can manage lessons for their subjects
CREATE POLICY "Instructors can insert lessons"
    ON lessons FOR INSERT
    WITH CHECK (
        get_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.id = lessons.subject_id
              AND subjects.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = lessons.offering_id
              AND offerings.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can update own lessons"
    ON lessons FOR UPDATE
    USING (
        get_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.id = lessons.subject_id
              AND subjects.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = lessons.offering_id
              AND offerings.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete lessons"
    ON lessons FOR DELETE
    USING (get_user_role() = 'admin');


-- ─── RESOURCES POLICIES ────────────────────────────────────

-- Same access as lessons: enrolled students + instructors + admins
CREATE POLICY "Enrolled users can view resources"
    ON resources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.id = resources.lesson_id
              AND (
                  is_enrolled(lessons.offering_id)
                  OR get_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM subjects
                      WHERE subjects.id = lessons.subject_id
                        AND subjects.instructor_id = auth.uid()
                  )
              )
        )
    );

CREATE POLICY "Instructors can insert resources"
    ON resources FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.id = resources.lesson_id
              AND (
                  get_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM subjects
                      WHERE subjects.id = lessons.subject_id
                        AND subjects.instructor_id = auth.uid()
                  )
              )
        )
    );

CREATE POLICY "Instructors can delete resources"
    ON resources FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.id = resources.lesson_id
              AND (
                  get_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM subjects
                      WHERE subjects.id = lessons.subject_id
                        AND subjects.instructor_id = auth.uid()
                  )
              )
        )
    );


-- ─── ENROLLMENTS POLICIES ──────────────────────────────────

-- Students can view their own enrollments; admins can view all
CREATE POLICY "Users can view own enrollments"
    ON enrollments FOR SELECT
    USING (student_id = auth.uid() OR get_user_role() = 'admin');

-- Any authenticated user can create an enrollment (for themselves)
CREATE POLICY "Students can create enrollments"
    ON enrollments FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Only admins can update enrollments (approve/reject)
CREATE POLICY "Admins can update enrollments"
    ON enrollments FOR UPDATE
    USING (get_user_role() = 'admin');


-- ─── CHAT ROOMS POLICIES ───────────────────────────────────

-- Enrolled students + instructors + admins can see chat rooms
CREATE POLICY "Enrolled users can view chat rooms"
    ON chat_rooms FOR SELECT
    USING (
        is_enrolled(offering_id)
        OR get_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM subjects
            WHERE subjects.id = chat_rooms.subject_id
              AND subjects.instructor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM offerings
            WHERE offerings.id = chat_rooms.offering_id
              AND offerings.instructor_id = auth.uid()
        )
    );

-- Admins can create chat rooms
CREATE POLICY "Admins can insert chat rooms"
    ON chat_rooms FOR INSERT
    WITH CHECK (get_user_role() = 'admin');


-- ─── CHAT MESSAGES POLICIES ────────────────────────────────

-- Members can read messages in rooms they have access to
CREATE POLICY "Members can view chat messages"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
              AND (
                  is_enrolled(chat_rooms.offering_id)
                  OR get_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM subjects
                      WHERE subjects.id = chat_rooms.subject_id
                        AND subjects.instructor_id = auth.uid()
                  )
                  OR EXISTS (
                      SELECT 1 FROM offerings
                      WHERE offerings.id = chat_rooms.offering_id
                        AND offerings.instructor_id = auth.uid()
                  )
              )
        )
    );

-- Members can send messages to rooms they have access to
CREATE POLICY "Members can send chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = chat_messages.room_id
              AND (
                  is_enrolled(chat_rooms.offering_id)
                  OR get_user_role() = 'admin'
                  OR EXISTS (
                      SELECT 1 FROM subjects
                      WHERE subjects.id = chat_rooms.subject_id
                        AND subjects.instructor_id = auth.uid()
                  )
                  OR EXISTS (
                      SELECT 1 FROM offerings
                      WHERE offerings.id = chat_rooms.offering_id
                        AND offerings.instructor_id = auth.uid()
                  )
              )
        )
    );


-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('payment-receipts', 'payment-receipts', false),  -- private: only admin + uploader
    ('resources', 'resources', false),                  -- private: only enrolled students
    ('thumbnails', 'thumbnails', true);                 -- public: visible on catalog

-- Storage policies for payment receipts
CREATE POLICY "Students can upload payment receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'payment-receipts'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view own receipts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'payment-receipts'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- Storage policies for resources
CREATE POLICY "Instructors can upload resources"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'resources'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid()
            AND role IN ('instructor', 'admin')
        )
    );

CREATE POLICY "Authenticated users can view resources"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'resources'
        AND auth.role() = 'authenticated'
    );

-- Storage policies for thumbnails (public bucket)
CREATE POLICY "Admins can upload thumbnails"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'thumbnails'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Anyone can view thumbnails"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'thumbnails');


-- ============================================================
-- ENABLE REALTIME for chat messages
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

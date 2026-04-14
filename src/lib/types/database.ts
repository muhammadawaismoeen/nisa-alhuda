/**
 * TypeScript types matching our Supabase database schema.
 * These ensure type safety across the entire application.
 *
 * In a production app, you'd auto-generate these with:
 *   npx supabase gen types typescript --project-id mcatnaujwuuqymbtotnr
 * For now, we define them manually to match our migration.
 */

export type UserRole = "admin" | "instructor" | "student";
export type OfferingType = "program" | "course" | "workshop" | "class";
export type FeeType = "one_time" | "monthly";
export type OfferingMode = "online" | "onsite" | "hybrid";
export type OfferingStatus = "draft" | "published" | "archived";
export type EnrollmentStatus = "pending" | "approved" | "rejected";
export type NotificationType =
  | "enrollment_approved"
  | "enrollment_rejected"
  | "fa_approved"
  | "fa_rejected"
  | "new_lesson"
  | "new_announcement"
  | "general";

// ─── Row Types (what you GET from the database) ───

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  is_suspended: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offering {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  type: OfferingType;
  price: number;
  /** India INR fee. When set, the 🇮🇳 India region charges this amount instead of PKR. */
  price_inr: number | null;
  /** International USD fee. When set, the wizard surfaces a 3rd payment region. */
  price_usd: number | null;
  thumbnail_url: string | null;
  status: OfferingStatus;
  instructor_id: string | null;
  schedule_start: string | null;
  fee_type: FeeType;
  mode: OfferingMode;
  schedule_end: string | null;
  live_class_link: string | null;
  is_featured: boolean;
  is_new: boolean;
  /** Marks a class that is already running but still accepting new joiners — renders an "On-going" badge. */
  is_ongoing: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  offering_id: string;
  title: string;
  slug: string;
  description: string | null;
  instructor_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  offering_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  live_class_link: string | null;
  recording_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface StudentDetails {
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  age: string;
  education_level: string;
  referral_source: string;
  message: string;
}

export interface Enrollment {
  id: string;
  student_id: string | null;
  offering_id: string;
  applicant_email: string;
  status: EnrollmentStatus;
  payment_receipt_url: string | null;
  payment_amount: number;
  payment_method: string;
  /** Currency the student paid in: 'PKR' | 'INR' | 'USD'. Defaults to 'PKR'. */
  payment_currency: string;
  student_details: StudentDetails | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  // Financial Assistance fields
  fa_requested: boolean;
  fa_reason: string | null;
  fa_income_range: string | null;
  fa_offered_amount: number | null;
  fa_approved_amount: number | null;
  fa_decision_note: string | null;
  fa_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  offering_id: string;
  subject_id: string | null;
  name: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  body: string;
  offering_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  offering_id: string;
  completed_at: string;
}

export interface LiveSession {
  id: string;
  instructor_id: string;
  offering_id: string;
  title: string;
  description: string | null;
  meeting_url: string;
  scheduled_at: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

// ─── Joined / Extended Types (for queries with relations) ───

export interface OfferingWithSubjects extends Offering {
  subjects: (Subject & { instructor: Profile })[];
}

export interface OfferingWithInstructor extends Offering {
  instructor: Profile | null;
}

export interface EnrollmentWithDetails extends Enrollment {
  student: Profile;
  offering: Offering;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Profile;
}

export interface AnnouncementWithAuthor extends Announcement {
  author: Profile;
  offering: Offering | null;
}

export interface LiveSessionWithDetails extends LiveSession {
  instructor: Profile;
  offering: Offering;
}

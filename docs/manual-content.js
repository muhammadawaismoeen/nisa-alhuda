/*
 * Content module for the Nisa Al-Huda Product Manual.
 * Exports:
 *   buildCover(helpers)   -> array of paragraphs for the cover page
 *   build(helpers)        -> array of all chapter blocks
 *
 * Helpers are passed in from generate-manual.js to avoid duplicating
 * styling logic.
 */

const { AlignmentType } = require("docx");

// ─────────────────────────────────────────────────────────────
// Cover page
// ─────────────────────────────────────────────────────────────

function buildCover({ run, BRAND }) {
  const { Paragraph } = require("docx");
  return [
    new Paragraph({ children: [run("")], spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("NISA AL-HUDA", { bold: true, size: 72, color: BRAND.primary })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("An Online Women's Islamic Learning Community", {
        italics: true, size: 28, color: BRAND.muted,
      })],
      spacing: { after: 960 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("Product Manual", { bold: true, size: 56, color: BRAND.heading })],
      spacing: { after: 240 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("End-to-End Feature Guide for Administrators, Instructors, and Students", {
        size: 24, color: BRAND.body,
      })],
      spacing: { after: 1920 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("Prepared for the Management Team", { size: 22, color: BRAND.muted })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("Version 1.0", { size: 22, color: BRAND.muted })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      }), { size: 22, color: BRAND.muted })],
      spacing: { after: 80 },
    }),
  ];
}

// ─────────────────────────────────────────────────────────────
// Main content builder
// ─────────────────────────────────────────────────────────────

function build(h) {
  const {
    h1, h2, h3, h4,
    p, body, bodyRich, run,
    bullet, bulletRich, numbered,
    callout, buildTable, spacer,
    BRAND, CONTENT_WIDTH,
  } = h;

  const blocks = [];

  // =============================================================
  // PART 1 — INTRODUCTION
  // =============================================================
  blocks.push(h1("1. Introduction & Executive Summary"));

  blocks.push(h2("1.1 About Nisa Al-Huda"));
  blocks.push(body(
    "Nisa Al-Huda is a women-only online Islamic learning community that combines structured programs, live classes, and a self-paced content library within a single modern web application. It is designed to serve learners across Pakistan, India, and the international diaspora with locally appropriate pricing, flexible payment options, and a compassionate financial assistance pathway for students in need."
  ));
  blocks.push(body(
    "The platform supports three kinds of users — administrators who run the organization, instructors who deliver the teaching, and students who come to learn. Each role has its own tailored dashboard, permissions, and workflows. This manual walks through every feature from all three perspectives so that the management team can gain a complete operational picture of the product."
  ));

  blocks.push(h2("1.2 Purpose of This Manual"));
  blocks.push(body(
    "This document is intended as a reference guide for the management team. It describes, in plain language, what each part of the system does, who uses it, and what happens behind the scenes. It is organized so readers can either read cover-to-cover for a full briefing or jump straight to a specific workflow using the table of contents."
  ));

  blocks.push(h2("1.3 Platform at a Glance"));
  blocks.push(buildTable({
    headers: ["Area", "What It Does"],
    widths: [2800, 6560],
    rows: [
      ["Public Catalog", "A public, searchable list of all published programs, courses, workshops, and classes — browsable without an account."],
      ["Enrollment", "A guided, multi-step wizard that lets guests or logged-in students join an offering, with region-based pricing (PKR, INR, USD) and optional Financial Assistance."],
      ["Financial Assistance (FA)", "A built-in review process where students can explain their situation, propose what they can pay, and receive either a partial discount or a full waiver."],
      ["Content Delivery", "Structured subjects and lessons with downloadable resources, live-class links (Zoom/Google Meet), and recording URLs."],
      ["Live Sessions", "Scheduled real-time classes visible to both instructors and their enrolled students, with a one-click join experience."],
      ["Community", "In-app announcements and notifications keep students informed about new lessons, schedule changes, and administrative decisions."],
      ["Administration", "Full back-office tools for reviewing payments, approving enrollments, managing users, tracking revenue, and publishing announcements."],
    ],
  }));

  blocks.push(h2("1.4 Who Uses What"));
  blocks.push(body(
    "Different people see very different parts of the platform. A public visitor may only ever see the landing page and the catalog. A student can browse, enroll, pay, and learn. Instructors focus on creating content and running their classes. Administrators hold the keys to everything — offerings, pricing, approvals, and users. The table below summarizes who touches which major area."
  ));

  blocks.push(buildTable({
    headers: ["Area", "Public Visitor", "Student", "Instructor", "Admin"],
    widths: [3400, 1490, 1490, 1490, 1490],
    rows: [
      ["Public catalog & offering pages", "✓", "✓", "✓", "✓"],
      ["Register / Log in / Password reset", "✓", "✓", "✓", "✓"],
      ["Enroll in offerings", "✓ (guest)", "✓", "—", "Manual enroll"],
      ["Upload payment receipt", "✓", "✓", "—", "—"],
      ["Request Financial Assistance", "✓", "✓", "—", "—"],
      ["View lessons & recordings", "—", "✓ (if enrolled)", "✓ (own)", "✓"],
      ["Download resources", "—", "✓ (if enrolled)", "✓ (own)", "✓"],
      ["Attend / host live sessions", "—", "Attend", "Host", "✓"],
      ["Post announcements", "—", "—", "✓ (own audience)", "✓ (global)"],
      ["Approve / reject enrollments", "—", "—", "—", "✓"],
      ["Approve / reject Financial Assistance", "—", "—", "—", "✓"],
      ["Create / edit / delete offerings", "—", "—", "—", "✓"],
      ["Manage users (suspend, view)", "—", "—", "—", "✓"],
      ["View revenue & payments ledger", "—", "—", "—", "✓"],
    ],
  }));

  // =============================================================
  // PART 2 — ARCHITECTURE
  // =============================================================
  blocks.push(h1("2. Platform Architecture (Plain English)"));

  blocks.push(h2("2.1 Technology Stack"));
  blocks.push(body(
    "The platform is built on a modern, widely supported stack that is fast to load, easy to maintain, and cost-efficient to operate. The table below lists the key pieces."
  ));
  blocks.push(buildTable({
    headers: ["Layer", "Technology", "Why It Matters"],
    widths: [2400, 2400, 4560],
    rows: [
      ["Web Application", "Next.js 16 (React 19)", "A modern framework that delivers pages instantly and works well on any device."],
      ["Styling", "Tailwind CSS v4 + base-ui components", "Consistent look and feel; easy to evolve the brand without rewriting screens."],
      ["Database", "Supabase (PostgreSQL)", "A managed, enterprise-grade database with built-in security rules per table."],
      ["Authentication", "Supabase Auth", "Secure email + password login with email verification and password reset."],
      ["File Storage", "Supabase Storage", "Private buckets for payment receipts and class resources; public bucket for offering thumbnails."],
      ["Hosting", "Vercel", "Global content delivery — pages load quickly for students anywhere in the world."],
      ["Email Delivery", "Supabase email service", "Transactional emails for account verification and password reset."],
    ],
  }));

  blocks.push(h2("2.2 Deployment Model"));
  blocks.push(body(
    "The application is deployed to Vercel's global edge network. When a developer pushes an update to the code repository, Vercel automatically builds and deploys the new version within a few minutes. There is no manual server maintenance. All data lives in a single Supabase project hosted in a managed cloud region, so there is one single source of truth for all users, enrollments, offerings, and content."
  ));

  blocks.push(h2("2.3 How Data Is Organized"));
  blocks.push(body(
    "All data is stored in tables in the managed PostgreSQL database. Each table represents one concept and is linked to related tables by ID. For example, an enrollment links to one student and one offering. The most important tables are described below."
  ));
  blocks.push(buildTable({
    headers: ["Table", "Purpose"],
    widths: [2400, 6960],
    rows: [
      ["profiles", "One row per user account. Stores name, phone, avatar, and role (admin, instructor, or student)."],
      ["offerings", "The products students enroll in — programs, courses, workshops, and classes. Holds pricing, description, schedule, and status."],
      ["subjects", "Sub-units within a program. Each is taught by one instructor."],
      ["lessons", "Individual teaching units inside a subject. Can have a schedule, a live-class link, and a recording URL."],
      ["resources", "Files (PDFs, slides, audio, video) attached to a lesson."],
      ["enrollments", "One row per student-in-an-offering. Tracks status (pending / approved / rejected), payment details, and Financial Assistance information."],
      ["announcements", "Posts from admins and instructors. Can be global or scoped to one offering."],
      ["notifications", "Personal in-app alerts for each user (enrollment approved, FA decision, new announcement, etc.)."],
      ["live_sessions", "Scheduled real-time class meetings tied to an offering."],
      ["lesson_progress", "Tracks which lessons a student has completed."],
      ["chat_rooms / chat_messages", "Discussion spaces per offering or subject."],
    ],
  }));

  blocks.push(h2("2.4 Security & Access Model"));
  blocks.push(body(
    "Every table in the database enforces its own access rules. A student logging in can only see their own enrollments and notifications — the database itself blocks them from seeing other people's data. Instructors can only see students enrolled in their own offerings. Administrators can see everything. This style of security is called Row-Level Security and it means that even if there were a bug in the application layer, sensitive data is still protected at the database."
  ));
  blocks.push(bullet("Passwords are never stored in plain text — Supabase handles secure hashing."));
  blocks.push(bullet("Payment receipts live in a private storage bucket; students see only their own, admins see all."));
  blocks.push(bullet("All traffic is encrypted end-to-end (HTTPS)."));
  blocks.push(bullet("Administrative privileges are role-checked both in the browser (for UI) and on the server (for actions), so the back-office cannot be accessed by a non-admin even if they try to navigate directly."));

  blocks.push(h2("2.5 Environments"));
  blocks.push(buildTable({
    headers: ["Environment", "Purpose", "Who Uses It"],
    widths: [2400, 4800, 2160],
    rows: [
      ["Production", "The live site that students, instructors, and admins use every day.", "Everyone"],
      ["Local Development", "A local copy running on a developer's laptop for building and testing new features.", "Developers"],
      ["Preview Deployments", "Temporary per-branch deployments created automatically when a new feature is proposed, for review before going live.", "Developers, QA"],
    ],
  }));

  // =============================================================
  // PART 3 — USER ROLES
  // =============================================================
  blocks.push(h1("3. User Roles & Access"));

  blocks.push(body(
    "Every logged-in user has exactly one role. The role determines which parts of the site appear in the sidebar, which actions are available, and which data the user can see. Roles are assigned by an administrator through the user directory."
  ));

  blocks.push(h2("3.1 Administrator"));
  blocks.push(body(
    "Administrators are the highest-privilege users. They run the organization, configure the catalog, review payments and Financial Assistance requests, and manage the staff of instructors. Any user can in principle be an administrator, but in practice this role is reserved for the operations team."
  ));
  blocks.push(bullet("Full visibility across all users, enrollments, payments, and content."));
  blocks.push(bullet("Ability to create, edit, archive, and delete offerings."));
  blocks.push(bullet("Ability to approve or reject enrollments and Financial Assistance."));
  blocks.push(bullet("Ability to suspend user accounts."));
  blocks.push(bullet("Ability to post global and offering-scoped announcements."));
  blocks.push(bullet("Ability to manually enroll a student (bypassing the checkout wizard)."));

  blocks.push(h2("3.2 Instructor"));
  blocks.push(body(
    "Instructors are the teachers. They see only the subjects they have been assigned to, the students enrolled in those subjects, and the live sessions they host. They cannot see other instructors' content."
  ));
  blocks.push(bullet("Create and edit lessons within their assigned subjects."));
  blocks.push(bullet("Upload downloadable resources for their students."));
  blocks.push(bullet("Schedule and host live classes."));
  blocks.push(bullet("Add recording URLs after live sessions finish."));
  blocks.push(bullet("See a list of their enrolled students with an engagement score."));
  blocks.push(bullet("Post announcements that reach their students."));
  blocks.push(bullet("View teaching analytics for their own content."));

  blocks.push(h2("3.3 Student"));
  blocks.push(body(
    "Students are the learners. They can browse the catalog, enroll in offerings, access lessons once approved, attend live classes, and receive announcements. They see only their own personal data."
  ));
  blocks.push(bullet("Browse the public catalog and offering pages."));
  blocks.push(bullet("Enroll in offerings via the guided wizard."));
  blocks.push(bullet("Request Financial Assistance if needed."));
  blocks.push(bullet("Upload payment receipts."));
  blocks.push(bullet("View and download resources for offerings they are enrolled in."));
  blocks.push(bullet("Watch recordings and join live sessions."));
  blocks.push(bullet("Track their own progress through lessons."));
  blocks.push(bullet("Receive and read announcements and notifications."));

  blocks.push(h2("3.4 Public Visitor (No Account)"));
  blocks.push(body(
    "A person visiting the site without logging in is treated as a public visitor. They can see marketing content and the full list of published offerings, and they can even start an enrollment as a guest. Registration is only required if they want to access lessons and track progress."
  ));

  // =============================================================
  // PART 4 — PUBLIC VISITOR EXPERIENCE
  // =============================================================
  blocks.push(h1("4. The Public Visitor Experience"));

  blocks.push(h2("4.1 Landing Page"));
  blocks.push(body(
    "The landing page is the first impression for anyone arriving at the site. It combines a mission statement, Qur'anic ayahs and prophetic traditions, a showcase of featured offerings, and clear calls-to-action inviting the visitor to either browse the catalog or create an account."
  ));
  blocks.push(h4("What the visitor sees"));
  blocks.push(bullet("A hero banner with the mission statement and two prominent buttons: Explore Programs and Create Free Account."));
  blocks.push(bullet("An ayah from Surah Al-Mujadila (58:11) highlighting the status of knowledge."));
  blocks.push(bullet("A grid of the six most recently published offerings."));
  blocks.push(bullet("A features section explaining the value proposition (structured programs, live classes, community, flexible pace)."));
  blocks.push(bullet("A prophetic tradition encouraging the pursuit of knowledge."));
  blocks.push(bullet("A testimonials slider with quotes from past students."));
  blocks.push(bullet("A final call-to-action to begin the journey."));

  blocks.push(h2("4.2 The Public Catalog"));
  blocks.push(body(
    "At /catalog the visitor sees the full list of available offerings. Each offering appears as a card showing its thumbnail, title, type (program, course, workshop, class), mode (online, onsite, hybrid), a short description, the start date, the price, and any applicable badges."
  ));
  blocks.push(h4("Badges on offering cards"));
  blocks.push(buildTable({
    headers: ["Badge", "Color", "Meaning"],
    widths: [1800, 1800, 5760],
    rows: [
      ["New", "Amber", "Recently launched. Set by an admin to highlight fresh content."],
      ["On-going", "Teal", "A class that is already in progress but still welcoming new joiners."],
      ["Age 12+", "Green", "Shown on programs that require a minimum age."],
    ],
  }));

  blocks.push(h2("4.3 Offering Detail Page"));
  blocks.push(body(
    "Clicking any offering opens its public detail page at /offerings/{slug}. This page presents the full story of the offering — its description, instructor, schedule, and pricing — and invites the visitor to enroll. Multiple prices are displayed when the offering supports multiple regions."
  ));
  blocks.push(h4("Page sections"));
  blocks.push(bullet("Header: title, type badge, mode badge, On-going/New badges."));
  blocks.push(bullet("Hero price tile: the main PKR price, with small hints underneath for India (INR) and international (USD) students when those prices are configured."));
  blocks.push(bullet("Schedule: start date, end date if set, and weekly meeting time for classes."));
  blocks.push(bullet("Instructor card: the teacher's name and profile image."));
  blocks.push(bullet("Full description: long-form content written by the admin."));
  blocks.push(bullet("Subjects list (for programs): what topics are covered and who teaches each."));
  blocks.push(bullet("Enroll button: takes the visitor into the enrollment wizard."));

  blocks.push(h2("4.4 Account Creation & Login"));
  blocks.push(body(
    "Accounts are created through /register. The visitor provides a full name, email address, and password. The platform sends a verification email, and on confirmation the account becomes active as a Student by default. Existing users sign in at /login with email and password. A Forgot Password link handles password resets via email."
  ));
  blocks.push(h4("Forms available"));
  blocks.push(buildTable({
    headers: ["Form", "Fields", "Outcome"],
    widths: [2200, 4360, 2800],
    rows: [
      ["Register", "Full Name, Email, Password, Confirm Password", "Account created; confirmation email sent."],
      ["Login", "Email, Password (with show/hide toggle)", "Redirected to the role-appropriate dashboard."],
      ["Forgot Password", "Email", "Reset link emailed to the user."],
      ["Reset Password", "New Password, Confirm New Password (both with show/hide toggle)", "Password updated; user redirected to their dashboard."],
    ],
  }));

  blocks.push(callout(
    "Usability detail",
    "All password fields across the site include an eye icon that lets the user reveal what they typed — reducing login errors on mobile without compromising security (the toggle only acts locally in the browser)."
  ));

  // =============================================================
  // PART 5 — STUDENT EXPERIENCE
  // =============================================================
  blocks.push(h1("5. Student Experience"));

  blocks.push(h2("5.1 Student Dashboard"));
  blocks.push(body(
    "After logging in, a student lands on their personal dashboard at /dashboard. It shows their active enrollments, recent announcements, upcoming live classes, and any unread notifications. From here a sidebar gives access to My Enrollments, Live Classes, Announcements, Notifications, and Settings."
  ));
  blocks.push(h4("Left sidebar for students"));
  blocks.push(buildTable({
    headers: ["Menu Item", "Destination"],
    widths: [2400, 6960],
    rows: [
      ["Dashboard", "Personal overview"],
      ["My Enrollments", "All offerings the student has applied for, with status"],
      ["Live Classes", "Upcoming real-time sessions for enrolled offerings"],
      ["Announcements", "Feed of posts from admins and instructors"],
      ["Notifications", "Personal notification history"],
      ["Settings", "Profile, avatar, and password management"],
    ],
  }));

  blocks.push(h2("5.2 The Enrollment Wizard"));
  blocks.push(body(
    "Enrollment is handled by a guided, multi-step wizard that adapts to whether the visitor is a guest or a logged-in student, and to the student's location. It lives at /offerings/{slug}/enroll."
  ));
  blocks.push(h4("Step-by-step flow"));
  blocks.push(numbered("Student Details — Name, email, phone, city, age, education level, referral source, and an optional message. For logged-in users the email field is prefilled and read-only. For guests, the email serves as the unique identifier so the system can prevent the same person from enrolling twice in the same offering."));
  blocks.push(numbered("Payment Region — The student selects 🇵🇰 Pakistan, 🇮🇳 India, or 🌍 International. The visible amount changes live based on the selection (PKR, INR, or USD). If an offering does not have a price for a region, that option is hidden."));
  blocks.push(numbered("Payment Method or Financial Assistance — The student chooses to pay by bank transfer (and will be asked for a receipt) or to request Financial Assistance. Requesting FA opens a mini-form asking why, what monthly income range they fit, and what amount they can comfortably offer."));
  blocks.push(numbered("Payment Receipt (only for paying students) — Upload a photo or PDF of the bank transfer receipt. The file is stored in a private bucket. A maximum file size applies."));
  blocks.push(numbered("Review & Submit — A summary screen shows every choice; the student can go back to any step. Submitting creates the enrollment row with status pending."));

  blocks.push(h4("Multi-currency pricing example (Noor Journey One)"));
  blocks.push(buildTable({
    headers: ["Region", "Currency", "Monthly Fee"],
    widths: [2400, 2400, 4560],
    rows: [
      ["Pakistan (default)", "PKR", "Rs. 3,000 / month"],
      ["India", "INR", "₹ 1,000 / month"],
      ["International", "USD", "$ 15 / month"],
    ],
  }));

  blocks.push(callout(
    "Duplicate protection",
    "The system checks whether the email has already enrolled in this offering. If so, the wizard blocks a second submission and shows the existing status instead."
  ));

  blocks.push(h2("5.3 My Enrollments"));
  blocks.push(body(
    "At /dashboard/student/enrollments the student sees a card for every offering they have applied to. Each card shows the offering title, amount paid, currency, current status, and — where relevant — rejection reason or FA decision."
  ));
  blocks.push(h4("Status and next action"));
  blocks.push(buildTable({
    headers: ["Status", "What the Student Sees", "Next Action"],
    widths: [1800, 4200, 3360],
    rows: [
      ["Pending", "Awaiting admin review — receipt uploaded.", "Wait for decision; will be notified."],
      ["Pending (FA requested)", "Financial Assistance request under review.", "Wait for admin's FA decision."],
      ["FA approved (partial)", "Reduced amount shown; banner asks to upload receipt for the lower fee.", "Click Upload Receipt and submit new receipt."],
      ["FA approved (full waiver)", "Automatically moved to Approved; access granted.", "Start learning immediately."],
      ["Approved", "Access granted.", "Open the offering from the dashboard."],
      ["Rejected", "Rejection banner with reason if provided.", "Re-enroll later or contact admin."],
    ],
  }));

  blocks.push(h2("5.4 Accessing Course Content"));
  blocks.push(body(
    "Once approved, the student can open their offering from the dashboard. Each program shows its subjects; each subject shows its lessons. Every lesson has optional attachments (PDF, audio, slides), a live-class link, and — after the class — a recording URL. The student can mark a lesson as complete to track personal progress."
  ));
  blocks.push(h4("What a lesson looks like"));
  blocks.push(bullet("Lesson title and description."));
  blocks.push(bullet("Scheduled date and time (if set)."));
  blocks.push(bullet("A Join Live Class button when a live link is provided."));
  blocks.push(bullet("A Watch Recording link once the instructor has added the recording URL."));
  blocks.push(bullet("A list of downloadable resources."));
  blocks.push(bullet("A Mark Complete button."));

  blocks.push(h2("5.5 Live Classes Hub"));
  blocks.push(body(
    "The student's Live Classes page groups upcoming and live-right-now sessions across every offering they are enrolled in. One tap opens the meeting link (Zoom, Google Meet, or any HTTPS URL the instructor configured)."
  ));

  blocks.push(h2("5.6 Announcements & Notifications"));
  blocks.push(body(
    "Announcements are broadcast messages — a teacher reminding students about an upcoming test, or the admin posting a Ramadan schedule. Notifications are personal alerts tied to actions on the student's own account: enrollment approvals, FA decisions, and when announcements arrive."
  ));
  blocks.push(h4("Notification bell"));
  blocks.push(body(
    "A bell icon in the top bar shows an unread count. Clicking it opens a short preview; a full history page is available at /dashboard/notifications. Notifications can be marked read individually or in bulk."
  ));

  blocks.push(h2("5.7 Settings"));
  blocks.push(body(
    "At /dashboard/settings the student can update their profile (full name, phone), change their avatar (uploaded to a public storage bucket), and change their password. Avatar uploads are cropped and stored as images; a default placeholder appears if none is set."
  ));

  // =============================================================
  // PART 6 — INSTRUCTOR EXPERIENCE
  // =============================================================
  blocks.push(h1("6. Instructor Experience"));

  blocks.push(h2("6.1 My Subjects (Instructor Home)"));
  blocks.push(body(
    "The instructor dashboard at /dashboard/instructor opens on a grid of assigned subjects. Each card shows the parent offering, the subject title, a short description, and a count of lessons. Tapping Manage Lessons opens the detail page for that subject."
  ));

  blocks.push(h2("6.2 Lesson Management"));
  blocks.push(body(
    "Inside a subject the instructor can add new lessons, edit existing ones, toggle publish/unpublish, reorder, and delete. Each lesson has the fields listed below."
  ));
  blocks.push(buildTable({
    headers: ["Field", "Purpose"],
    widths: [2400, 6960],
    rows: [
      ["Title", "Display name of the lesson."],
      ["Description", "Short context visible to students above the lesson."],
      ["Scheduled date & time", "When the live class will take place (optional)."],
      ["Live class link", "A Zoom, Google Meet, or other HTTPS link. Students tap to join."],
      ["Recording URL", "Added after the class. Any HTTPS URL — Google Drive, YouTube, Vimeo, etc."],
      ["Visibility", "Draft (hidden) or Published (visible to enrolled students)."],
    ],
  }));
  blocks.push(callout(
    "Publish vs. Draft",
    "Lessons default to Draft when created. Flip them to Published once content is ready. Draft lessons are only visible to the instructor and admins; students never see them."
  ));

  blocks.push(h2("6.3 Resources"));
  blocks.push(body(
    "The Resources hub at /dashboard/instructor/resources lets the instructor select any of their subjects and any of its lessons, then drag-and-drop files to attach to that lesson. Supported types include PDFs, Word documents, images, presentations, spreadsheets, audio, and video, up to 10 MB per file. Once uploaded, files appear to enrolled students under that lesson."
  ));

  blocks.push(h2("6.4 Live Hub"));
  blocks.push(body(
    "At /dashboard/instructor/live the instructor schedules and manages live classes. The page groups sessions into Live Now, Upcoming, and Past. Each session captures a title, an offering, a meeting URL, a scheduled datetime, and a duration. The Instructor can join their own sessions with a single button. Past sessions can be deleted once recordings are captured."
  ));

  blocks.push(h2("6.5 Students View"));
  blocks.push(body(
    "The instructor sees a deduplicated list of every student enrolled in their offerings, with a computed engagement score (0–100) and a tier label (Highly Active, Active, Moderate, New). The score is based on enrollment tenure, phone presence, multi-enrollment status, and how early the student joined the offering. This is a read-only view — to add or remove students, the instructor contacts an administrator."
  ));

  blocks.push(h2("6.6 Analytics"));
  blocks.push(body(
    "The Analytics page gives a snapshot of teaching health. It shows total students, average course completion (percentage of lessons published), recording upload status, a bar chart of the most active time of day among enrollees, and a summary of upcoming sessions."
  ));
  blocks.push(h4("Example analytics tiles"));
  blocks.push(buildTable({
    headers: ["Tile", "What It Shows"],
    widths: [2800, 6560],
    rows: [
      ["Total Students", "Count of unique approved enrollees across the instructor's offerings."],
      ["Avg Course Completion", "Percentage of lessons marked Published."],
      ["Published Lessons", "Total, with a secondary breakdown of how many have recordings."],
      ["Most Active Time of Day", "When students typically enrolled — morning, afternoon, evening, or night."],
      ["Active Subjects", "Subjects per lesson-count bar chart."],
      ["Recordings", "Count of uploaded, pending, and not-yet-scheduled recordings."],
      ["Teaching Summary", "Upcoming sessions, total content volume, total reach."],
    ],
  }));

  blocks.push(h2("6.7 Announcements"));
  blocks.push(body(
    "Instructors can post announcements that reach either all of their students (by selecting an offering they teach) or — if allowed by policy — all users. Students receive an in-app notification when the announcement goes live. The instructor can pin or delete their own announcements."
  ));

  // =============================================================
  // PART 7 — ADMIN EXPERIENCE
  // =============================================================
  blocks.push(h1("7. Administrator Experience"));

  blocks.push(h2("7.1 Admin Dashboard"));
  blocks.push(body(
    "The admin landing page at /dashboard/admin surfaces the four most important metrics — enrolled students, total revenue (PKR + INR, with USD shown separately), active sessions right now, and total lessons — plus a quick-stats tile and a recent-enrollments widget. A prominent Pending Approvals badge links directly to the payments ledger whenever there is work to do."
  ));
  blocks.push(buildTable({
    headers: ["Tile", "What It Shows"],
    widths: [2800, 6560],
    rows: [
      ["Enrolled Sisters", "Total students, with approved enrollments shown as subtext."],
      ["Total Revenue", "Sum of approved PKR + INR payments (face value). USD shown separately if non-zero."],
      ["Active Sessions", "Lessons scheduled within ±1 hour of now."],
      ["Total Lessons", "Every lesson in the catalog, with a separate count of those published."],
      ["Quick Stats", "Offerings, users, published lessons, pending approvals."],
      ["Recent Enrollments", "The five most recent, with status and timestamps."],
    ],
  }));

  blocks.push(h2("7.2 Offerings Management"));
  blocks.push(body(
    "Admins manage the catalog at /dashboard/admin/offerings. The page shows each offering as a card with its thumbnail, type badge, status, price, start date, and four quick actions: Feature, Archive, Edit, Delete. A New Offering button opens the creation form."
  ));
  blocks.push(h4("Creating or editing an offering"));
  blocks.push(buildTable({
    headers: ["Section", "Fields"],
    widths: [2400, 6960],
    rows: [
      ["Basic Info", "Title, URL slug (auto-generated), Type (Program / Course / Workshop / Class), Status (Draft / Published / Archived), Mode (Online / Onsite / Hybrid), \"New\" badge checkbox, \"On-going\" badge checkbox, Short Description, Full Description."],
      ["Pricing & Schedule", "Price in PKR, Fee Type (one-time vs. monthly), Start Date, End Date."],
      ["Subjects (programs only)", "Add a subject with Title, Instructor selector, Slug, Description. Any number of subjects can be added or removed."],
    ],
  }));
  blocks.push(callout(
    "International pricing (INR, USD)",
    "The create/edit form currently captures the base PKR price. INR and USD prices are managed directly in the database per offering to keep the admin form uncluttered. For offerings where international pricing is desired, the engineering team can add those values on request, or a future iteration of the form can expose them."
  ));

  blocks.push(h4("Per-card quick actions"));
  blocks.push(buildTable({
    headers: ["Action", "Icon", "Effect"],
    widths: [2000, 1500, 5860],
    rows: [
      ["Feature / Unfeature", "Star", "Pins the offering to the featured section of the home page."],
      ["Archive / Restore", "Archive", "Moves the offering to Archived (hidden from active catalog) or restores it to Published."],
      ["Edit", "Pencil", "Opens the full edit form."],
      ["Delete", "Trash", "Permanently removes the offering and all of its subjects, lessons, and resources. Asks for confirmation."],
    ],
  }));

  blocks.push(h2("7.3 Enrollments Management"));
  blocks.push(body(
    "At /dashboard/admin/enrollments every enrollment is visible. Pending Financial Assistance requests appear at the top in a dedicated section so they do not get buried. Below that is the full enrollment list sorted by newest first. Admins can approve, reject, view a receipt, delete an enrollment, or manually enroll a known student via a dedicated button."
  ));
  blocks.push(h4("Actions per enrollment row"));
  blocks.push(buildTable({
    headers: ["Button", "When It Appears", "Effect"],
    widths: [2000, 3000, 4360],
    rows: [
      ["View Receipt", "If a receipt was uploaded.", "Opens the receipt image in an overlay; PDF opens in a new tab."],
      ["Approve", "If status is Pending.", "Marks status as Approved, records reviewer, notifies the student."],
      ["Reject", "If status is Pending.", "Opens a dialog for a reason, marks status as Rejected, shows the reason to the student in a notification."],
      ["Delete", "Always.", "Permanently removes the enrollment record and the associated receipt file. Used for cleanup or mistaken submissions."],
      ["Review FA", "On Financial Assistance rows.", "Opens a dialog to approve a custom amount, approve a full waiver, or reject with a reason."],
    ],
  }));

  blocks.push(h2("7.4 Financial Assistance Review"));
  blocks.push(body(
    "Clicking Review FA opens a three-state dialog. The admin first sees a read-only summary of the student's case — their name, the offering, the original fee, the amount the student proposed to pay, their income range, and the reason they wrote. From there the admin can move to Approve or Reject."
  ));
  blocks.push(h4("Approve path"));
  blocks.push(bullet("The admin types an approved amount, pre-filled with the amount the student offered."));
  blocks.push(bullet("If the amount is set to zero → a full waiver. The enrollment is immediately approved and the student receives both an FA-approved notification and an enrollment-approved notification."));
  blocks.push(bullet("If the amount is greater than zero → a partial approval. The student sees the reduced fee and is prompted to upload a new receipt. Status remains Pending until the admin approves the payment."));
  blocks.push(bullet("An optional internal note (not shown to the student) can be added for audit purposes."));
  blocks.push(h4("Reject path"));
  blocks.push(bullet("The admin provides a reason — this will be shown to the student in their notification, so it is phrased tactfully."));
  blocks.push(bullet("The enrollment status flips to Rejected and an enrollment-rejected notification is sent."));

  blocks.push(h2("7.5 Manual Enrollment"));
  blocks.push(body(
    "For situations where a student has paid through another channel, or where the admin wants to grant access without the wizard, Manual Enroll on the enrollments page lets the admin pick a registered student and an offering and create an enrollment at Approved status in one step. The same dialog supports Remove Enrollment to revoke access."
  ));

  blocks.push(h2("7.6 Payments Ledger"));
  blocks.push(body(
    "The Payments page at /dashboard/admin/payments shows the financial health of the platform. Revenue tiles split PKR/INR from USD because summing them at face value would be misleading. A Pending Approvals section lists every enrollment whose receipt is awaiting review, with quick Approve/Reject buttons. Below that is an exhaustive transaction table with receipt viewer, amount, currency, date, and status."
  ));
  blocks.push(h4("Receipt lightbox"));
  blocks.push(body(
    "Clicking the receipt icon opens a full-screen lightbox with zoom-in, zoom-out, and close controls. Image receipts can be examined at up to 3× zoom; PDF receipts open in a new browser tab."
  ));

  blocks.push(h2("7.7 User Directory"));
  blocks.push(body(
    "At /dashboard/admin/users the admin finds every user on the platform with role counts at the top (total, students, instructors, admins), search by name/phone/ID, and filter-by-role chips. Each user card shows their avatar, name, role, suspension state, phone, join date, and — for students — how many approved enrollments they have."
  ));
  blocks.push(h4("Actions"));
  blocks.push(bullet("Suspend / Unsuspend — toggles the account's access without deleting it. Used for policy violations or inactive accounts. Self-cannot-suspend-self."));
  blocks.push(bullet("Login As — copies the user ID to the clipboard with instructions for impersonation via Supabase. Used for support and debugging."));

  blocks.push(h2("7.8 Announcements (Admin View)"));
  blocks.push(body(
    "Admins can post global announcements (reaching every user) or scope announcements to a specific offering (reaching only its approved students). Posted announcements trigger notifications automatically. Admins can pin, unpin, or delete any announcement on the platform."
  ));

  // =============================================================
  // PART 8 — KEY WORKFLOWS
  // =============================================================
  blocks.push(h1("8. Key Workflows End-to-End"));

  blocks.push(h2("8.1 Launching a New Offering"));
  blocks.push(numbered("Admin opens Offerings → New Offering."));
  blocks.push(numbered("Fills out title, slug, type, status (Draft), mode, fee type, PKR price, description, and optional badges (New, On-going)."));
  blocks.push(numbered("For programs, adds subjects and assigns each to an instructor."));
  blocks.push(numbered("Saves as Draft to preview internally, or sets to Published to make it live."));
  blocks.push(numbered("(Optional) Engineering adds INR and USD prices via migration if international enrollment is expected."));
  blocks.push(numbered("(Optional) Admin toggles the Featured star to pin on the home page."));

  blocks.push(h2("8.2 A Paying Student's Journey"));
  blocks.push(numbered("Visitor browses the catalog and opens an offering."));
  blocks.push(numbered("Clicks Enroll and steps through the wizard — details, region, payment method."));
  blocks.push(numbered("Uploads a bank-transfer receipt."));
  blocks.push(numbered("Reviews the summary and submits. Status is Pending."));
  blocks.push(numbered("Admin reviews the payment in the ledger, confirms the receipt matches, and clicks Approve."));
  blocks.push(numbered("Student receives an enrollment-approved notification and can now access lessons."));

  blocks.push(h2("8.3 Financial Assistance — Full Waiver"));
  blocks.push(numbered("Student enrolls and selects Request Financial Assistance instead of uploading a receipt."));
  blocks.push(numbered("Student explains their situation, selects an income range, and offers an amount they can manage (could be zero)."));
  blocks.push(numbered("Admin opens Enrollments, sees the request under Financial Assistance Requests, and clicks Review FA."));
  blocks.push(numbered("Admin decides on a full waiver and enters 0 as the approved amount."));
  blocks.push(numbered("System marks the enrollment Approved, records payment method as waiver, and fires two notifications — FA approved with full waiver and enrollment approved."));
  blocks.push(numbered("Student sees both notifications and gains access immediately."));

  blocks.push(h2("8.4 Financial Assistance — Partial Approval"));
  blocks.push(numbered("Same starting point — student submits an FA request."));
  blocks.push(numbered("Admin decides on a reduced fee (e.g., 1,200 PKR instead of the original 3,000)."));
  blocks.push(numbered("Admin enters 1,200 as the approved amount and saves."));
  blocks.push(numbered("System marks fa_approved_amount = 1200 and reduces payment_amount to 1200. Status stays Pending."));
  blocks.push(numbered("Student receives an FA-approved notification saying \"please proceed to pay the reduced fee\"."));
  blocks.push(numbered("Student uploads a new receipt for the reduced amount."));
  blocks.push(numbered("Admin reviews and approves. Student is now Approved."));
  blocks.push(numbered("Only one FA-approved notification fires throughout this flow — the trigger guards against duplicates."));

  blocks.push(h2("8.5 Guest Enrollment"));
  blocks.push(numbered("A visitor without an account clicks Enroll."));
  blocks.push(numbered("The wizard captures their email as the unique identifier."));
  blocks.push(numbered("After submission, the enrollment is created with student_id set to NULL."));
  blocks.push(numbered("Notifications for guest enrollments are intentionally suppressed — there is no account to deliver them to."));
  blocks.push(numbered("If the same email has a pre-existing account, the admin can later link the records by updating student_id."));
  blocks.push(numbered("When the admin approves, the student is told verbally or by email to register with that same address to access their offering."));

  blocks.push(h2("8.6 Payment Rejection"));
  blocks.push(numbered("Admin opens an enrollment in the payments ledger."));
  blocks.push(numbered("Views the receipt in the lightbox and identifies a problem (wrong amount, wrong account, blurry)."));
  blocks.push(numbered("Clicks Reject and types a reason — e.g., \"The amount on the receipt does not match the fee. Please resubmit.\""));
  blocks.push(numbered("Status flips to Rejected; the student receives an enrollment-rejected notification containing the reason."));

  // =============================================================
  // PART 9 — NOTIFICATIONS
  // =============================================================
  blocks.push(h1("9. The Notifications System"));

  blocks.push(body(
    "Notifications are personal messages that appear in a user's bell icon and full notifications page. They are created automatically by the system whenever a relevant event occurs. Each notification has a type (which controls its icon and color), a title, a body, an optional deep link, and a timestamp. Users can mark notifications as read individually or in bulk."
  ));

  blocks.push(h2("9.1 Notification Types"));
  blocks.push(buildTable({
    headers: ["Type", "When It Fires", "Audience"],
    widths: [2400, 4800, 2160],
    rows: [
      ["enrollment_approved", "Enrollment status changes to Approved.", "The student."],
      ["enrollment_rejected", "Enrollment status changes to Rejected (any reason).", "The student."],
      ["fa_approved", "FA approved amount is first set (either full waiver or partial).", "The student."],
      ["fa_rejected", "(Reserved) Currently FA rejections are communicated through enrollment_rejected.", "The student."],
      ["new_announcement", "Admin or instructor posts an announcement.", "All users or all enrolled students of the scoped offering."],
      ["new_lesson", "(Reserved) Not currently active.", "—"],
      ["general", "Manual admin messages.", "Any user."],
    ],
  }));

  blocks.push(h2("9.2 Duplicate Prevention"));
  blocks.push(body(
    "A common concern with automated notifications is double-firing. The platform defends against this with database-level guards: the fa_approved trigger only runs the first time an approved amount is set; subsequent updates (for example, when the admin approves the final payment) do not re-fire it. This keeps the student's inbox clean."
  ));

  // =============================================================
  // PART 10 — MULTI-CURRENCY PRICING
  // =============================================================
  blocks.push(h1("10. Multi-Currency Pricing"));

  blocks.push(body(
    "To reach students across multiple regions without asking them to convert currencies, the platform supports up to three prices per offering. Every offering has a PKR price (the default for Pakistan) and optional INR and USD prices. During enrollment the student picks their region, and the wizard charges the correct currency."
  ));

  blocks.push(h2("10.1 How Regions Work"));
  blocks.push(buildTable({
    headers: ["Region", "Flag", "Currency Stored", "Example (NJ1)"],
    widths: [2100, 1100, 2560, 3600],
    rows: [
      ["Pakistan", "🇵🇰", "PKR", "Rs. 3,000 / month"],
      ["India", "🇮🇳", "INR", "₹ 1,000 / month"],
      ["International", "🌍", "USD", "$ 15 / month"],
    ],
  }));
  blocks.push(body(
    "If an offering has no INR price configured, the India option simply displays the PKR amount and records the payment as PKR. If an offering has no USD price, the International option is hidden entirely. This keeps simple classes simple and gives flagship programs the international reach they need."
  ));

  blocks.push(h2("10.2 Revenue Reporting"));
  blocks.push(body(
    "Mixing currencies at face value can be misleading — ₹1,000 and Rs. 1,000 are not the same amount of value. The platform's approach is pragmatic: PKR and INR are summed together to represent regional revenue (the organization's leadership already reads INR as roughly comparable to PKR for reporting purposes), and USD is tracked as a separate line so it never gets mixed in. Future iterations can introduce a conversion rate for a unified dashboard if that is preferred."
  ));

  // =============================================================
  // PART 11 — FINANCIAL ASSISTANCE FRAMEWORK
  // =============================================================
  blocks.push(h1("11. Financial Assistance Framework"));

  blocks.push(body(
    "Financial Assistance is a core value of the platform. The goal is that no student is turned away because of her financial situation. The framework is built directly into the enrollment wizard so requesting aid is not a separate, uncomfortable process — it is simply one of the payment options."
  ));

  blocks.push(h2("11.1 What the Student Provides"));
  blocks.push(bullet("Reason — a short written explanation of their situation."));
  blocks.push(bullet("Monthly income range — a dropdown (e.g., less than 25k PKR / 10k INR, 25k–50k, etc.)."));
  blocks.push(bullet("Offered amount — what the student themselves feels they can manage (could be zero)."));

  blocks.push(h2("11.2 What the Admin Decides"));
  blocks.push(buildTable({
    headers: ["Decision", "Approved Amount", "Outcome"],
    widths: [2400, 2200, 4760],
    rows: [
      ["Full waiver", "0", "Enrollment immediately approved. Student enters the offering for free."],
      ["Partial approval", "> 0, ≤ original fee", "Student pays the reduced fee and uploads a new receipt. Admin reviews and approves."],
      ["Rejection", "(none set)", "Enrollment rejected with a reason shown to the student."],
    ],
  }));

  blocks.push(h2("11.3 Audit Trail"));
  blocks.push(body(
    "Every FA decision is timestamped, attributed to the reviewing admin, and preserved on the enrollment record: the income range, the reason, the student's offered amount, the admin's approved amount, the admin's internal note, and the review time. This means the organization has a complete paper trail for every waiver or discount."
  ));

  // =============================================================
  // PART 12 — CONTENT & FILE MANAGEMENT
  // =============================================================
  blocks.push(h1("12. Content & File Management"));

  blocks.push(h2("12.1 Storage Buckets"));
  blocks.push(buildTable({
    headers: ["Bucket", "Visibility", "Contents", "Upload By"],
    widths: [2000, 1800, 3600, 1960],
    rows: [
      ["payment-receipts", "Private", "Bank transfer receipts uploaded by students.", "Students (guests too)"],
      ["resources", "Private", "PDFs, slides, audio, video attached to lessons.", "Instructors & admins"],
      ["thumbnails", "Public", "Offering cover images shown on cards and detail pages.", "Admins"],
      ["avatars", "Public", "User profile pictures.", "Any user (own avatar)"],
    ],
  }));

  blocks.push(h2("12.2 Resource Types"));
  blocks.push(body(
    "Lessons accept a wide range of resource formats: PDF, DOCX, images (PNG/JPG/WebP), presentations (PPTX), spreadsheets (XLSX), audio (MP3), and video (MP4). Each file has a 10 MB maximum; very large recordings should be hosted externally (Google Drive, YouTube) and added as a Recording URL on the lesson."
  ));

  blocks.push(h2("12.3 Receipt Handling"));
  blocks.push(body(
    "Payment receipts live in a private bucket. Only the uploader and administrators can read them. When an enrollment is deleted, the system makes a best-effort attempt to remove the receipt file as well so that storage does not accumulate orphans."
  ));

  // =============================================================
  // PART 13 — DATA MODEL REFERENCE
  // =============================================================
  blocks.push(h1("13. Data Model Reference"));

  blocks.push(body(
    "This section is a quick reference for the fields on the most important tables. It is intended for technical readers and anyone building reports off the database."
  ));

  blocks.push(h2("13.1 profiles"));
  blocks.push(buildTable({
    headers: ["Field", "Description"],
    widths: [2400, 6960],
    rows: [
      ["id", "UUID — matches Supabase auth user ID."],
      ["full_name", "Display name."],
      ["avatar_url", "URL in the avatars bucket (nullable)."],
      ["role", "admin / instructor / student."],
      ["phone", "Contact number (nullable)."],
      ["is_suspended", "True if the account is suspended."],
      ["must_change_password", "If true, user is forced to change password on next login."],
    ],
  }));

  blocks.push(h2("13.2 offerings"));
  blocks.push(buildTable({
    headers: ["Field", "Description"],
    widths: [2400, 6960],
    rows: [
      ["title", "Display title."],
      ["slug", "URL-friendly identifier."],
      ["description / short_description", "Long and short marketing copy."],
      ["type", "program / course / workshop / class."],
      ["status", "draft / published / archived."],
      ["mode", "online / onsite / hybrid."],
      ["fee_type", "one_time / monthly."],
      ["price / price_inr / price_usd", "Base fee and regional alternatives (INR/USD nullable)."],
      ["instructor_id", "Primary instructor (nullable)."],
      ["schedule_start / schedule_end", "Dates."],
      ["is_featured / is_new / is_ongoing", "Display flags / badges."],
      ["thumbnail_url", "Cover image."],
      ["live_class_link", "Optional fallback live link for the offering."],
    ],
  }));

  blocks.push(h2("13.3 enrollments"));
  blocks.push(buildTable({
    headers: ["Field", "Description"],
    widths: [2400, 6960],
    rows: [
      ["student_id", "Foreign key to profiles. NULL for guest enrollments."],
      ["offering_id", "Which offering this is for."],
      ["applicant_email", "Primary identifier. Unique with offering_id."],
      ["status", "pending / approved / rejected."],
      ["payment_amount", "Amount actually owed / paid (may be reduced by FA)."],
      ["payment_currency", "PKR / INR / USD."],
      ["payment_method", "bank_transfer / waiver / manual / etc."],
      ["payment_receipt_url", "File path in the payment-receipts bucket."],
      ["student_details", "JSON with name, phone, city, age, education, referral, message."],
      ["rejection_reason", "Shown to the student if rejected."],
      ["reviewed_by / reviewed_at", "Audit — which admin acted and when."],
      ["fa_requested", "Was Financial Assistance requested?"],
      ["fa_reason / fa_income_range / fa_offered_amount", "The student's FA submission."],
      ["fa_approved_amount", "Admin's decision (0 = full waiver, > 0 = partial)."],
      ["fa_decision_note", "Internal note from the admin (not shown to the student)."],
      ["fa_reviewed_at", "When the FA decision was made."],
    ],
  }));

  blocks.push(h2("13.4 subjects & lessons"));
  blocks.push(buildTable({
    headers: ["Table", "Key Fields"],
    widths: [2000, 7360],
    rows: [
      ["subjects", "offering_id, title, slug, description, instructor_id, sort_order."],
      ["lessons", "offering_id, subject_id, title, description, scheduled_at, live_class_link, recording_url, sort_order, is_published."],
      ["resources", "lesson_id, title, file_url, file_type, file_size."],
      ["lesson_progress", "student_id, lesson_id, offering_id, completed_at."],
      ["live_sessions", "instructor_id, offering_id, title, description, meeting_url, scheduled_at, duration_minutes."],
    ],
  }));

  blocks.push(h2("13.5 announcements & notifications"));
  blocks.push(buildTable({
    headers: ["Table", "Key Fields"],
    widths: [2000, 7360],
    rows: [
      ["announcements", "author_id, title, body, offering_id (null for global), is_pinned."],
      ["notifications", "user_id, type, title, body, link, is_read, metadata."],
    ],
  }));

  // =============================================================
  // PART 14 — GLOSSARY
  // =============================================================
  blocks.push(h1("14. Glossary"));

  blocks.push(buildTable({
    headers: ["Term", "Definition"],
    widths: [2400, 6960],
    rows: [
      ["Offering", "The umbrella term for anything a student can enroll in — a program, course, workshop, or class."],
      ["Program", "A long-form, structured curriculum broken into subjects (e.g., Noor Journey One)."],
      ["Course", "A self-contained learning path, typically one teacher and one topic."],
      ["Workshop", "A short, focused training — usually a single session."],
      ["Class", "An ongoing recurring meeting (e.g., Tabseer ul Quran — Wednesdays and Fridays)."],
      ["Subject", "A sub-unit within a program, led by a single instructor."],
      ["Lesson", "An individual teaching unit inside a subject. Can be live, recorded, or text-based."],
      ["Resource", "A file attached to a lesson (PDF, slide deck, audio, video)."],
      ["Enrollment", "A student's link to an offering. Has a status: pending, approved, or rejected."],
      ["Financial Assistance (FA)", "The workflow for requesting reduced or waived tuition."],
      ["Full Waiver", "A Financial Assistance approval with approved amount = 0."],
      ["Partial Approval", "A Financial Assistance approval with approved amount > 0. Student pays the reduced fee."],
      ["Guest Enrollment", "An enrollment created without a registered account — identified by email."],
      ["New Badge", "Amber badge highlighting a recently launched offering."],
      ["On-going Badge", "Teal badge marking a class that is already running but still open for new joiners."],
      ["Featured", "An offering pinned to the homepage or top of the catalog."],
      ["Live Session", "A scheduled real-time class meeting (Zoom / Google Meet / etc.)."],
      ["Recording URL", "A link to the video recording of a past live session."],
      ["Receipt", "A photo or PDF of a bank-transfer confirmation, uploaded by a paying student."],
      ["Role", "One of admin, instructor, or student — determines what each user can see and do."],
      ["Row-Level Security (RLS)", "A database-level protection that enforces per-user access rules on every query."],
    ],
  }));

  // =============================================================
  // PART 15 — APPENDIX
  // =============================================================
  blocks.push(h1("15. Appendix: Route & Feature Index"));

  blocks.push(h2("15.1 Public Routes"));
  blocks.push(buildTable({
    headers: ["Route", "Feature"],
    widths: [3200, 6160],
    rows: [
      ["/", "Landing page."],
      ["/catalog", "All published offerings."],
      ["/offerings/{slug}", "Public offering detail page."],
      ["/offerings/{slug}/enroll", "The enrollment wizard."],
      ["/register", "Create a new student account."],
      ["/login", "Log in."],
      ["/forgot-password", "Request a password reset email."],
      ["/reset-password", "Set a new password using a reset token."],
    ],
  }));

  blocks.push(h2("15.2 Student Routes"));
  blocks.push(buildTable({
    headers: ["Route", "Feature"],
    widths: [3800, 5560],
    rows: [
      ["/dashboard", "Personal overview."],
      ["/dashboard/student/enrollments", "My Enrollments."],
      ["/dashboard/student/live", "Upcoming & live classes."],
      ["/dashboard/student/offerings/{id}", "Content access for an approved offering."],
      ["/dashboard/announcements", "Announcement feed."],
      ["/dashboard/notifications", "Personal notifications."],
      ["/dashboard/settings", "Profile, avatar, password."],
    ],
  }));

  blocks.push(h2("15.3 Instructor Routes"));
  blocks.push(buildTable({
    headers: ["Route", "Feature"],
    widths: [3800, 5560],
    rows: [
      ["/dashboard/instructor", "My Subjects (home)."],
      ["/dashboard/instructor/subjects/{id}", "Manage a subject's lessons."],
      ["/dashboard/instructor/live", "Schedule and manage live sessions."],
      ["/dashboard/instructor/students", "Enrolled students with engagement score."],
      ["/dashboard/instructor/resources", "Upload downloadable resources."],
      ["/dashboard/instructor/analytics", "Teaching analytics."],
    ],
  }));

  blocks.push(h2("15.4 Admin Routes"));
  blocks.push(buildTable({
    headers: ["Route", "Feature"],
    widths: [3800, 5560],
    rows: [
      ["/dashboard/admin", "Admin overview."],
      ["/dashboard/admin/offerings", "Catalog management."],
      ["/dashboard/admin/offerings/new", "Create a new offering."],
      ["/dashboard/admin/offerings/{id}/edit", "Edit an existing offering."],
      ["/dashboard/admin/enrollments", "All enrollments with FA queue."],
      ["/dashboard/admin/payments", "Payments ledger and revenue."],
      ["/dashboard/admin/users", "User directory."],
      ["/dashboard/announcements", "Post and manage announcements."],
    ],
  }));

  blocks.push(h2("15.5 Example Offerings Configured on Launch"));
  blocks.push(buildTable({
    headers: ["Offering", "Type", "Fee Structure", "Mode", "Notes"],
    widths: [2400, 1600, 2200, 1560, 1600],
    rows: [
      ["Noor Journey One", "Program", "PKR 3,000 / mo, INR 1,000 / mo, USD 15 / mo", "Online", "Flagship 1-year program. Multi-currency."],
      ["Treasures of Tajweed", "Class", "PKR 1,000 / mo", "Online", "Weekly tajweed class. PKR only."],
      ["Tabseer ul Quran", "Class", "Free", "Online", "Wednesdays & Fridays 7–8 PM PKT. On-going."],
      ["Daura e Quran", "Class", "Free (one-time)", "Onsite", "Historical Ramadan intensive — now archived."],
    ],
  }));

  blocks.push(h1("16. Closing Note"));
  blocks.push(body(
    "Nisa Al-Huda is designed to grow with the community it serves. The architecture supports multi-regional pricing, a generous Financial Assistance workflow, and the tools for teachers to deliver content and for the operations team to steward the platform with confidence. The management team is encouraged to use this manual as a starting point for training new staff, briefing partners, and planning the next stage of the platform's evolution."
  ));
  blocks.push(body(
    "May Allah ﷻ accept this work and make it a means of benefit for every learner and teacher who passes through the platform. Ameen."
  ));

  return blocks;
}

module.exports = { buildCover, build };

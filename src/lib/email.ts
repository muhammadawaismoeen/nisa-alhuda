/**
 * Email Service — sends transactional emails via Resend.
 * SERVER-ONLY: uses RESEND_API_KEY from environment.
 *
 * All functions are fire-and-forget — they log errors but never throw,
 * so a failed email never blocks the main workflow.
 */
import { Resend } from "resend";

// Lazy-init: Resend throws if the key is empty at construction time.
// We only create the client when an email function is actually called.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email.");
    return null;
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM =
  process.env.EMAIL_FROM || "Nisa Al-Huda <onboarding@resend.dev>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://nisa-alhuda.vercel.app";
const APP_NAME = "Nisa Al-Huda";

// ─── Shared HTML wrapper ────────────────────────────────

function wrap(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#8b1a4a;padding:24px 32px;text-align:center;">
            <img src="${SITE_URL}/logo-white.png" alt="${APP_NAME}" width="140" height="81" style="display:block;margin:0 auto;width:140px;height:auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f5f0eb;text-align:center;border-top:1px solid #e8e0d8;">
            <p style="margin:0;font-size:12px;color:#8c7e72;">
              This is an automated message from ${APP_NAME}.<br/>
              <a href="${SITE_URL}" style="color:#8b1a4a;text-decoration:none;">Visit Dashboard</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function btn(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#8b1a4a;border-radius:8px;padding:12px 28px;">
      <a href="${href}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${label}</a>
    </td></tr>
  </table>`;
}

// ─── Decorative helpers ────────────────────────────────

function arabicVerse(text: string): string {
  return `<p style="margin:24px 0;text-align:center;font-size:22px;line-height:1.8;color:#8b1a4a;font-family:'Traditional Arabic','Scheherazade New',serif;direction:rtl;">${text}</p>`;
}

function divider(): string {
  return `<div style="margin:24px 0;text-align:center;color:#d4a574;font-size:14px;letter-spacing:6px;">&#10022; &#10022; &#10022;</div>`;
}

function quoteBlock(text: string, attribution?: string): string {
  return `<div style="margin:20px 0;padding:20px 24px;background:linear-gradient(135deg,#fdf6f0 0%,#f5ebe0 100%);border-radius:12px;border-left:4px solid #d4a574;">
    <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;font-style:italic;">"${text}"</p>
    ${attribution ? `<p style="margin:8px 0 0;color:#8c7e72;font-size:12px;text-align:right;">— ${attribution}</p>` : ""}
  </div>`;
}

function heartWrap(body: string, accentColor = "#8b1a4a"): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(139,26,74,0.08);">
        <!-- Decorative Top -->
        <tr>
          <td style="background:linear-gradient(135deg,${accentColor} 0%,#a0325e 50%,#d4a574 100%);padding:32px;text-align:center;">
            <img src="${SITE_URL}/logo-white.png" alt="${APP_NAME}" width="160" height="93" style="display:block;margin:0 auto;width:160px;height:auto;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 28px;">
            ${body}
          </td>
        </tr>
        <!-- Warm Footer -->
        <tr>
          <td style="padding:24px 28px;background:#fdf6f0;text-align:center;border-top:1px solid #f0e6dc;">
            <p style="margin:0 0 8px;font-size:13px;color:#8c7e72;">With love and du'a,</p>
            <p style="margin:0 0 12px;font-size:14px;color:#8b1a4a;font-weight:600;">${APP_NAME} Team</p>
            <a href="${SITE_URL}" style="color:#d4a574;font-size:12px;text-decoration:none;">Visit Our Platform</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

// ─── Email Senders ──────────────────────────────────────

/**
 * Enrollment approved — student gets access.
 */
export async function sendEnrollmentApprovedEmail(
  to: string,
  studentName: string,
  offeringTitle: string,
  offeringId: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Enrollment Approved — ${offeringTitle}`,
      html: wrap(`
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Assalamu Alaykum${studentName ? ` ${studentName}` : ""}!</h2>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          Great news! Your enrollment in <strong>${offeringTitle}</strong> has been approved.
          You can now access all course materials and live sessions.
        </p>
        ${btn(`${SITE_URL}/dashboard/student/offerings/${offeringId}`, "Go to My Course")}
        <p style="margin:0;color:#888;font-size:13px;">
          May Allah bless your journey of seeking knowledge.
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] Enrollment approved email failed:", err);
  }
}

/**
 * Enrollment rejected — student is notified with reason.
 */
export async function sendEnrollmentRejectedEmail(
  to: string,
  studentName: string,
  offeringTitle: string,
  reason: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Enrollment Update — ${offeringTitle}`,
      html: wrap(`
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Assalamu Alaykum${studentName ? ` ${studentName}` : ""}!</h2>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          We regret to inform you that your enrollment in <strong>${offeringTitle}</strong> was not approved.
        </p>
        ${reason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin:0 0 16px;">
          <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
        </div>` : ""}
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          If you have any questions, please don't hesitate to reach out to us.
        </p>
        ${btn(`${SITE_URL}/catalog`, "Browse Other Offerings")}
      `),
    });
  } catch (err) {
    console.error("[Email] Enrollment rejected email failed:", err);
  }
}

/**
 * Financial assistance approved — full waiver or reduced fee.
 */
export async function sendFaApprovedEmail(
  to: string,
  studentName: string,
  offeringTitle: string,
  approvedAmount: number,
  isFullWaiver: boolean
) {
  const message = isFullWaiver
    ? "Your financial assistance request has been approved with a <strong>full fee waiver</strong>. You are now enrolled and can start learning immediately."
    : `Your financial assistance request has been approved. Your reduced fee is <strong>Rs. ${approvedAmount.toLocaleString("en-PK")}</strong>. Please upload your payment receipt to complete enrollment.`;

  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Financial Assistance Approved — ${offeringTitle}`,
      html: wrap(`
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Assalamu Alaykum${studentName ? ` ${studentName}` : ""}!</h2>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          ${message}
        </p>
        ${btn(`${SITE_URL}/dashboard/student/enrollments`, "View My Enrollments")}
        <p style="margin:0;color:#888;font-size:13px;">
          May Allah ease your path to knowledge.
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] FA approved email failed:", err);
  }
}

/**
 * Financial assistance rejected.
 */
export async function sendFaRejectedEmail(
  to: string,
  studentName: string,
  offeringTitle: string,
  reason: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Financial Assistance Update — ${offeringTitle}`,
      html: wrap(`
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Assalamu Alaykum${studentName ? ` ${studentName}` : ""}!</h2>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          We've reviewed your financial assistance request for <strong>${offeringTitle}</strong>.
          Unfortunately, we are unable to grant assistance at this time.
        </p>
        ${reason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin:0 0 16px;">
          <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Note:</strong> ${reason}</p>
        </div>` : ""}
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          You may still enroll by paying the full fee, or reach out if your circumstances change.
        </p>
        ${btn(`${SITE_URL}/catalog`, "Browse Offerings")}
      `),
    });
  } catch (err) {
    console.error("[Email] FA rejected email failed:", err);
  }
}

/**
 * New announcement — sent to enrolled students.
 */
export async function sendAnnouncementEmail(
  to: string,
  studentName: string,
  announcementTitle: string,
  announcementBody: string,
  offeringTitle?: string
) {
  const scope = offeringTitle ? ` for ${offeringTitle}` : "";
  // Truncate body for email preview
  const preview =
    announcementBody.length > 300
      ? announcementBody.slice(0, 300) + "..."
      : announcementBody;

  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${announcementTitle}${scope}`,
      html: wrap(`
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">Assalamu Alaykum${studentName ? ` ${studentName}` : ""}!</h2>
        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
          A new announcement has been posted${scope}:
        </p>
        <div style="background:#f5f0eb;padding:16px 20px;border-radius:8px;margin:0 0 16px;">
          <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:16px;">${announcementTitle}</h3>
          <p style="margin:0;color:#555;font-size:14px;line-height:1.6;white-space:pre-line;">${preview}</p>
        </div>
        ${btn(`${SITE_URL}/dashboard/announcements`, "View Announcements")}
      `),
    });
  } catch (err) {
    console.error("[Email] Announcement email failed:", err);
  }
}

// ─── Motivational / Emaan-Boosting Templates ───────────

/**
 * Available template keys for the broadcast system.
 */
export const EMAIL_TEMPLATES = {
  welcome: {
    label: "Welcome to the Family",
    description: "Warm welcome for new students joining the platform",
    subjectDefault: "Welcome to Nisa Al-Huda — Your Journey Begins",
  },
  encouragement: {
    label: "Keep Going, Sister!",
    description: "Motivational boost for students mid-course",
    subjectDefault: "A Reminder That You Are Doing Amazing",
  },
  milestone: {
    label: "Milestone Celebration",
    description: "Celebrate a student achievement or course progress",
    subjectDefault: "MashaAllah — Look How Far You've Come!",
  },
  reminder_gentle: {
    label: "Gentle Study Reminder",
    description: "Soft, caring nudge to continue learning",
    subjectDefault: "We Miss You — Your Knowledge Awaits",
  },
  dua_friday: {
    label: "Jumu'ah Blessings",
    description: "Friday blessings and motivational message",
    subjectDefault: "Jumu'ah Mubarak — A Beautiful Reminder",
  },
  ramadan: {
    label: "Ramadan Greetings",
    description: "Special Ramadan blessings and encouragement",
    subjectDefault: "Ramadan Mubarak from Nisa Al-Huda",
  },
  gratitude: {
    label: "Thank You / Jazakillah",
    description: "Express gratitude to students for being part of the journey",
    subjectDefault: "Jazakillahu Khairan — Thank You, Dear Sister",
  },
  new_course: {
    label: "New Course Announcement",
    description: "Exciting announcement about a new course or offering",
    subjectDefault: "Something Special Is Coming Your Way!",
  },
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

/**
 * Welcome to the Family — sent to new students.
 */
export async function sendWelcomeEmail(
  to: string,
  studentName: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.welcome.subjectDefault,
      html: heartWrap(`
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Assalamu Alaykum wa Rahmatullahi wa Barakatuh</h2>
        <p style="margin:0 0 20px;color:#8b1a4a;font-size:16px;text-align:center;font-weight:600;">${studentName ? `Dear ${studentName}` : "Dear Sister"}</p>

        ${arabicVerse("طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَىٰ كُلِّ مُسْلِمٍ")}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;text-align:center;">
          Welcome to the <strong>Nisa Al-Huda</strong> family!
          You have taken a beautiful step on the path of seeking knowledge,
          and we are honored to walk this journey with you.
        </p>

        ${divider()}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Every great scholar began exactly where you are today — with a sincere intention
          and a heart open to learning. The Prophet (&#65018;) said that whoever follows
          a path seeking knowledge, Allah will make the path to Jannah easy for them.
        </p>

        ${quoteBlock(
          "Seeking knowledge is an obligation upon every Muslim.",
          "Ibn Majah"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Here at Nisa Al-Huda, you are not just a student — you are part of a sisterhood
          united by faith and the love of learning. We pray that every lesson brings
          you closer to Allah and fills your heart with noor.
        </p>

        ${btn(`${SITE_URL}/catalog`, "Explore Your Courses")}

        <p style="margin:0;color:#8b1a4a;font-size:14px;text-align:center;font-style:italic;">
          May Allah bless your journey and make you among the women of guidance.
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] Welcome email failed:", err);
  }
}

/**
 * Keep Going, Sister! — motivational mid-course encouragement.
 */
export async function sendEncouragementEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.encouragement.subjectDefault,
      html: heartWrap(`
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Keep Going, Dear Sister!</h2>
        <p style="margin:0 0 20px;color:#8b1a4a;font-size:16px;text-align:center;">${studentName ? studentName : "Beloved Student"}</p>

        ${arabicVerse("فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Ash-Sharh (94:5-6)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          We know the path of seeking knowledge isn't always easy. There are days when
          life gets busy, when the lessons feel challenging, and when you wonder if
          you're making progress. We want you to know — <strong>you absolutely are</strong>.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:#f9f5f0;border-radius:12px;border:1px solid #f0e6dc;">
          <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "Verily, with hardship comes ease. Allah does not burden a soul beyond what it can bear.",
          "Quran 94:5-6, 2:286"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Every ayah you learn, every lesson you attend, every moment you spend seeking
          Allah's knowledge — it is all written for you. The angels lower their wings
          for the seeker of knowledge out of pleasure with what they do.
        </p>

        ${divider()}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;text-align:center;">
          Don't give up, dear sister. Your effort is seen by the One who never forgets.
        </p>

        ${btn(`${SITE_URL}/dashboard`, "Continue Learning")}
      `),
    });
  } catch (err) {
    console.error("[Email] Encouragement email failed:", err);
  }
}

/**
 * Milestone Celebration — celebrate student achievement.
 */
export async function sendMilestoneEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.milestone.subjectDefault,
      html: heartWrap(`
        <div style="text-align:center;margin-bottom:16px;">
          <span style="font-size:40px;">&#127775;</span>
        </div>
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">MashaAllah, ${studentName || "Dear Sister"}!</h2>
        <p style="margin:0 0 20px;color:#8b1a4a;font-size:15px;text-align:center;">Look how far you've come!</p>

        ${arabicVerse("وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah At-Talaq (65:2)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          We are so proud of your dedication and consistency. In a world full of distractions,
          you chose to invest your time in what truly matters — and that is something
          truly beautiful in the sight of Allah.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:linear-gradient(135deg,#fdf6f0 0%,#f5ebe0 100%);border-radius:12px;text-align:center;">
          <p style="margin:0;color:#5c4a3a;font-size:16px;line-height:1.7;font-weight:500;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "The best of you are those who learn the Quran and teach it.",
          "Sahih al-Bukhari"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Keep shining, keep learning, and keep inspiring those around you.
          May Allah accept your efforts and grant you the sweetness of knowledge
          that softens the heart and strengthens the soul.
        </p>

        ${btn(`${SITE_URL}/dashboard`, "Keep Going!")}

        <p style="margin:0;color:#8b1a4a;font-size:14px;text-align:center;font-style:italic;">
          Barakallahu feeki — we are honored to have you.
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] Milestone email failed:", err);
  }
}

/**
 * Gentle Study Reminder — caring nudge to return.
 */
export async function sendGentleReminderEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.reminder_gentle.subjectDefault,
      html: heartWrap(`
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">We Miss You, ${studentName || "Dear Sister"}</h2>
        <p style="margin:0 0 24px;color:#8c7e72;font-size:14px;text-align:center;">Your seat in the circle of knowledge is always reserved</p>

        ${arabicVerse("وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Adh-Dhariyat (51:55)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Life has a way of pulling us in many directions, and we understand.
          This isn't a guilt trip — it's a gentle reminder from sisters who care about you
          that your journey of learning is still waiting for you, whenever you're ready.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:#f9f5f0;border-radius:12px;border:1px solid #f0e6dc;">
          <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "And remind, for indeed the reminder benefits the believers.",
          "Quran 51:55"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Even if you can only spare a few minutes, come back and listen to one lesson,
          read one ayah, or simply sit in the company of knowledge. Every small step
          counts, and Allah rewards the one who strives.
        </p>

        ${divider()}

        ${btn(`${SITE_URL}/dashboard`, "Return to Your Courses")}

        <p style="margin:0;color:#8b1a4a;font-size:14px;text-align:center;font-style:italic;">
          We're here whenever you're ready. No rush, no pressure — just love.
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] Gentle reminder email failed:", err);
  }
}

/**
 * Jumu'ah Mubarak — Friday blessings.
 */
export async function sendJumuahEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.dua_friday.subjectDefault,
      html: heartWrap(`
        <div style="text-align:center;margin-bottom:8px;">
          <span style="font-size:32px;">&#9770;</span>
        </div>
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Jumu'ah Mubarak</h2>
        <p style="margin:0 0 24px;color:#8b1a4a;font-size:15px;text-align:center;">${studentName ? `Dear ${studentName}` : "Dear Sister"}</p>

        ${arabicVerse("إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Al-Ahzab (33:56)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          On this blessed day, we send you our warmest salaam and du'a.
          May Allah shower His mercy upon you, lighten your burdens,
          and fill your heart with tranquility and gratitude.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:linear-gradient(135deg,#fdf6f0 0%,#f5ebe0 100%);border-radius:12px;">
          <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "Send abundant blessings upon me on Friday, for it is witnessed by the angels.",
          "Sunan an-Nasa'i"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Remember to increase your salawat upon the Prophet (&#65018;),
          recite Surah Al-Kahf, and make plenty of du'a — especially in the last
          hour before Maghrib, for there is a moment on Friday when du'a is accepted.
        </p>

        ${divider()}

        <p style="margin:0 0 8px;color:#555;font-size:15px;line-height:1.8;text-align:center;">
          <strong>Today's Reminder:</strong> Take a moment to forgive someone,
          mend a relationship, and ask Allah for the best in this world and the next.
        </p>

        ${btn(`${SITE_URL}/dashboard`, "Continue Your Learning")}
      `, "#2d6a4f"),
    });
  } catch (err) {
    console.error("[Email] Jumuah email failed:", err);
  }
}

/**
 * Ramadan Mubarak — special Ramadan greetings.
 */
export async function sendRamadanEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.ramadan.subjectDefault,
      html: heartWrap(`
        <div style="text-align:center;margin-bottom:8px;">
          <span style="font-size:36px;">&#127769;</span>
        </div>
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Ramadan Mubarak!</h2>
        <p style="margin:0 0 24px;color:#8b1a4a;font-size:15px;text-align:center;">${studentName ? `Dear ${studentName}` : "Dear Sister"}</p>

        ${arabicVerse("شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Al-Baqarah (2:185)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          The most blessed month is upon us — a month in which the gates of Jannah
          are opened, the gates of Hellfire are closed, and the shayateen are chained.
          What a beautiful opportunity to draw closer to Allah!
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:linear-gradient(135deg,#f0f5e8 0%,#e8f0dc 100%);border-radius:12px;border-left:4px solid #2d6a4f;">
          <p style="margin:0;color:#2d5a3f;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "Whoever fasts Ramadan out of faith and seeking reward, all their previous sins will be forgiven.",
          "Sahih al-Bukhari & Muslim"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          This Ramadan, let us strive to:
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 16px 8px;">
          <tr><td style="padding:4px 8px;color:#2d6a4f;font-size:18px;vertical-align:top;">&#10038;</td><td style="padding:4px 0;color:#555;font-size:14px;line-height:1.6;">Complete or increase our recitation of the Quran</td></tr>
          <tr><td style="padding:4px 8px;color:#2d6a4f;font-size:18px;vertical-align:top;">&#10038;</td><td style="padding:4px 0;color:#555;font-size:14px;line-height:1.6;">Pray each Taraweeh with presence of heart</td></tr>
          <tr><td style="padding:4px 8px;color:#2d6a4f;font-size:18px;vertical-align:top;">&#10038;</td><td style="padding:4px 0;color:#555;font-size:14px;line-height:1.6;">Make sincere du'a in the last third of the night</td></tr>
          <tr><td style="padding:4px 8px;color:#2d6a4f;font-size:18px;vertical-align:top;">&#10038;</td><td style="padding:4px 0;color:#555;font-size:14px;line-height:1.6;">Be generous in charity and kind in our words</td></tr>
        </table>

        ${divider()}

        <p style="margin:0;color:#2d6a4f;font-size:14px;text-align:center;font-style:italic;">
          May Allah accept our fasting, our prayers, and our learning.
          Ramadan Kareem!
        </p>
      `, "#2d6a4f"),
    });
  } catch (err) {
    console.error("[Email] Ramadan email failed:", err);
  }
}

/**
 * Jazakillah / Gratitude email.
 */
export async function sendGratitudeEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.gratitude.subjectDefault,
      html: heartWrap(`
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Jazakillahu Khairan</h2>
        <p style="margin:0 0 24px;color:#8b1a4a;font-size:15px;text-align:center;">${studentName ? `Dear ${studentName}` : "Dear Sister"}</p>

        ${arabicVerse("لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Ibrahim (14:7)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Today, we simply want to say <strong>thank you</strong>.
          Thank you for being part of the Nisa Al-Huda family. Thank you for showing up,
          for striving, for choosing to learn and grow in your deen.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:#f9f5f0;border-radius:12px;border:1px solid #f0e6dc;">
          <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "If you are grateful, I will surely give you more.",
          "Quran 14:7"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Every student who joins us brings barakah to our community. Your presence,
          your questions, your dedication — they inspire us to keep teaching and keep serving.
          You are the reason Nisa Al-Huda exists.
        </p>

        ${divider()}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;text-align:center;">
          We make du'a for you and your family — for health, barakah, and closeness to Allah.
          May He reward you abundantly for every moment you spend seeking His knowledge.
        </p>

        ${btn(`${SITE_URL}/dashboard`, "Visit Your Dashboard")}
      `),
    });
  } catch (err) {
    console.error("[Email] Gratitude email failed:", err);
  }
}

/**
 * New Course Announcement — exciting new offering.
 */
export async function sendNewCourseEmail(
  to: string,
  studentName: string,
  customMessage?: string
) {
  try {
    const resend = getResend();
    if (!resend) return;
    await resend.emails.send({
      from: FROM,
      to,
      subject: EMAIL_TEMPLATES.new_course.subjectDefault,
      html: heartWrap(`
        <div style="text-align:center;margin-bottom:8px;">
          <span style="font-size:36px;">&#128218;</span>
        </div>
        <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:22px;text-align:center;">Something Special Awaits!</h2>
        <p style="margin:0 0 24px;color:#8b1a4a;font-size:15px;text-align:center;">${studentName ? `Dear ${studentName}` : "Dear Sister"}</p>

        ${arabicVerse("وَقُل رَّبِّ زِدْنِي عِلْمًا")}
        <p style="margin:-12px 0 20px;color:#8c7e72;font-size:12px;text-align:center;">Surah Ta-Ha (20:114)</p>

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          We are thrilled to share some exciting news with you!
          A new learning opportunity is being prepared with love and care,
          designed to bring you closer to the Quran and deepen your understanding of our beautiful deen.
        </p>

        ${customMessage ? `<div style="margin:16px 0;padding:20px;background:linear-gradient(135deg,#fdf6f0 0%,#f5ebe0 100%);border-radius:12px;border:2px dashed #d4a574;">
          <p style="margin:0;color:#5c4a3a;font-size:15px;line-height:1.7;">${customMessage}</p>
        </div>` : ""}

        ${quoteBlock(
          "And say: My Lord, increase me in knowledge.",
          "Quran 20:114"
        )}

        <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.8;">
          Stay tuned and keep checking our catalog for updates.
          We can't wait for you to experience what's coming!
        </p>

        ${btn(`${SITE_URL}/catalog`, "Browse Our Catalog")}

        <p style="margin:0;color:#8b1a4a;font-size:14px;text-align:center;font-style:italic;">
          Share this with a sister who might benefit — the reward is multiplied!
        </p>
      `),
    });
  } catch (err) {
    console.error("[Email] New course email failed:", err);
  }
}

/**
 * Generic sender: routes a template key to the right function.
 */
export async function sendTemplateEmail(
  templateKey: EmailTemplateKey,
  to: string,
  studentName: string,
  customMessage?: string
) {
  const senders: Record<EmailTemplateKey, (to: string, name: string, msg?: string) => Promise<void>> = {
    welcome: sendWelcomeEmail,
    encouragement: sendEncouragementEmail,
    milestone: sendMilestoneEmail,
    reminder_gentle: sendGentleReminderEmail,
    dua_friday: sendJumuahEmail,
    ramadan: sendRamadanEmail,
    gratitude: sendGratitudeEmail,
    new_course: sendNewCourseEmail,
  };

  const sender = senders[templateKey];
  if (sender) await sender(to, studentName, customMessage);
}

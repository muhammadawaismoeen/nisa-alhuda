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
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">${APP_NAME}</span>
            <br/>
            <span style="color:#e8c4c4;font-size:12px;letter-spacing:1px;">WOMEN OF GUIDANCE</span>
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

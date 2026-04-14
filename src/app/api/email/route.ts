/**
 * POST /api/email — sends a notification email.
 *
 * Called from client components after enrollment approve/reject,
 * FA decisions, and announcement creation.
 *
 * Requires the caller to be an authenticated admin/instructor.
 * Looks up recipient data server-side so the client never handles emails.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEnrollmentApprovedEmail,
  sendEnrollmentRejectedEmail,
  sendAnnouncementEmail,
} from "@/lib/email";

export async function POST(req: NextRequest) {
  // Verify caller is admin or instructor
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "instructor"].includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const { type } = body;

  const admin = createAdminClient();

  try {
    if (type === "enrollment_approved" || type === "enrollment_rejected") {
      const { enrollmentId, reason } = body;
      if (!enrollmentId) {
        return NextResponse.json(
          { error: "enrollmentId required" },
          { status: 400 }
        );
      }

      // Look up enrollment + offering + student
      const { data: enrollment } = await admin
        .from("enrollments")
        .select(
          "applicant_email, student_id, offering_id, offerings(title, id)"
        )
        .eq("id", enrollmentId)
        .single();

      if (!enrollment) {
        return NextResponse.json(
          { error: "Enrollment not found" },
          { status: 404 }
        );
      }

      // Get student name and email
      let email = enrollment.applicant_email;
      let studentName = "";

      if (enrollment.student_id) {
        const { data: studentProfile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", enrollment.student_id)
          .single();
        studentName = studentProfile?.full_name || "";

        // Prefer auth email for logged-in users
        const { data: authUser } = await admin.auth.admin.getUserById(
          enrollment.student_id
        );
        if (authUser?.user?.email) email = authUser.user.email;
      }

      if (!email) {
        return NextResponse.json(
          { error: "No email found for student" },
          { status: 404 }
        );
      }

      const offering = enrollment.offerings as unknown as {
        title: string;
        id: string;
      };

      if (type === "enrollment_approved") {
        await sendEnrollmentApprovedEmail(
          email,
          studentName,
          offering.title,
          offering.id
        );
      } else {
        await sendEnrollmentRejectedEmail(
          email,
          studentName,
          offering.title,
          reason || "No reason provided."
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (type === "announcement") {
      const { announcementTitle, announcementBody, offeringId } = body;
      if (!announcementTitle || !announcementBody) {
        return NextResponse.json(
          { error: "title and body required" },
          { status: 400 }
        );
      }

      let offeringTitle: string | undefined;
      let recipientIds: string[] = [];

      if (offeringId) {
        // Offering-scoped: notify only approved enrolled students
        const { data: offering } = await admin
          .from("offerings")
          .select("title")
          .eq("id", offeringId)
          .single();
        offeringTitle = offering?.title;

        const { data: enrollments } = await admin
          .from("enrollments")
          .select("student_id")
          .eq("offering_id", offeringId)
          .eq("status", "approved")
          .not("student_id", "is", null);

        recipientIds =
          enrollments
            ?.map((e) => e.student_id)
            .filter((id): id is string => !!id) || [];
      } else {
        // Global announcement: notify all users except the author
        const { data: profiles } = await admin
          .from("profiles")
          .select("id")
          .neq("id", user.id);

        recipientIds = profiles?.map((p) => p.id) || [];
      }

      // Fetch emails + names for all recipients
      for (const userId of recipientIds) {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        const { data: prof } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();

        if (authUser?.user?.email) {
          await sendAnnouncementEmail(
            authUser.user.email,
            prof?.full_name || "",
            announcementTitle,
            announcementBody,
            offeringTitle
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[API /email] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

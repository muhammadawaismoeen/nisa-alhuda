/**
 * Enrollment Page — multi-step wizard for enrolling in any offering.
 * Generic template: works for programs, courses, and workshops.
 * Protected: redirects to login if not authenticated.
 */
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentWizard } from "./enrollment-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import type { Offering, Profile } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Enroll",
  description: "Complete your enrollment by submitting payment.",
};

const typeLabels = {
  program: "Program",
  course: "Course",
  workshop: "Workshop",
  class: "Class",
};

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/offerings/${slug}/enroll`);
  }

  // Fetch user profile (for pre-filling form)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Fetch offering
  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single<Offering>();

  if (!offering) notFound();

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("offering_id", offering.id)
    .single();

  // If already enrolled, show status
  if (existingEnrollment) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="glass">
          <CardContent className="p-8 text-center">
            {existingEnrollment.status === "pending" ? (
              <>
                <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Enrollment Pending</h1>
                <p className="text-muted-foreground mb-6">
                  Your enrollment for <strong>{offering.title}</strong> is under
                  review. We&apos;ll notify you once it&apos;s approved.
                </p>
                <LinkButton href="/dashboard/student" variant="outline">
                  Go to Dashboard
                </LinkButton>
              </>
            ) : existingEnrollment.status === "approved" ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Already Enrolled!</h1>
                <p className="text-muted-foreground mb-6">
                  You&apos;re already enrolled in <strong>{offering.title}</strong>.
                  Head to your dashboard to start learning.
                </p>
                <LinkButton href="/dashboard/student">
                  Go to Dashboard
                </LinkButton>
              </>
            ) : (
              <>
                <Clock className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Enrollment Rejected</h1>
                <p className="text-muted-foreground mb-6">
                  Your previous enrollment was not approved. Please contact support
                  for assistance.
                </p>
                <LinkButton href="/catalog" variant="outline">
                  Browse Catalog
                </LinkButton>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <span className="inline-block text-xs font-medium uppercase tracking-wider text-primary bg-secondary px-3 py-1 rounded-full mb-3">
          {typeLabels[offering.type]}
        </span>
        <h1 className="text-3xl font-bold mb-2">Enroll in {offering.title}</h1>
        <p className="text-muted-foreground">
          Complete the steps below to secure your spot.
        </p>
      </div>

      <EnrollmentWizard
        offeringId={offering.id}
        offeringTitle={offering.title}
        offeringType={offering.type}
        offeringPrice={offering.price}
        offeringFeeType={offering.fee_type}
        userId={user.id}
        userName={profile?.full_name || ""}
        userPhone={profile?.phone || ""}
      />
    </div>
  );
}

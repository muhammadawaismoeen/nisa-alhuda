/**
 * Enrollment Page — shows bank details and collects payment receipt.
 * Protected: redirects to login if not authenticated.
 */
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentForm } from "./enrollment-form";
import { formatPrice, APP_NAME } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Upload, Clock } from "lucide-react";
import type { Offering } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Enroll",
  description: "Complete your enrollment by submitting payment.",
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

  // Get the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

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
                <p className="text-muted-foreground">
                  Your enrollment for <strong>{offering.title}</strong> is under
                  review. We&apos;ll notify you once it&apos;s approved.
                </p>
              </>
            ) : existingEnrollment.status === "approved" ? (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Already Enrolled!</h1>
                <p className="text-muted-foreground">
                  You&apos;re already enrolled in <strong>{offering.title}</strong>.
                  Head to your dashboard to start learning.
                </p>
              </>
            ) : (
              <>
                <Clock className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Enrollment Rejected</h1>
                <p className="text-muted-foreground">
                  Your previous enrollment was not approved. Please contact support
                  for assistance.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeLabels = {
    program: "Program",
    course: "Course",
    workshop: "Workshop",
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-8">
        <Badge className="mb-3">{typeLabels[offering.type]}</Badge>
        <h1 className="text-3xl font-bold mb-2">Enroll in {offering.title}</h1>
        <p className="text-muted-foreground">
          Complete the payment and upload your receipt to enroll.
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: CreditCard, label: "Make Payment", step: 1 },
          { icon: Upload, label: "Upload Receipt", step: 2 },
          { icon: CheckCircle, label: "Get Approved", step: 3 },
        ].map((item) => (
          <div
            key={item.step}
            className="flex flex-col items-center text-center gap-2"
          >
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Step {item.step}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Details Card */}
        <Card className="glass">
          <CardContent className="p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">
              Payment Details
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/60">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(offering.price)}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-medium">JazzCash / EasyPaisa / Bank Transfer</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Title</p>
                  <p className="font-medium">{APP_NAME}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p className="font-medium font-mono">0300-1234567</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  <strong>Important:</strong> Please include your full name in the
                  payment reference/description so we can match it to your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Form Card */}
        <Card className="glass">
          <CardContent className="p-6">
            <h2 className="font-heading font-semibold text-lg mb-4">
              Upload Payment Receipt
            </h2>
            <EnrollmentForm
              offeringId={offering.id}
              offeringPrice={offering.price}
              userId={user.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Enrolled Students — per-offering roster.
 * Shows all approved enrollments for an offering with full student details:
 * name, age, phone, city, country, email. Admin reference view.
 */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
} from "lucide-react";
import type { Enrollment, Offering, StudentDetails } from "@/lib/types/database";
import { EnrollDialog } from "./enroll-dialog";

type EnrollmentWithDetails = Enrollment & {
  student_details: (StudentDetails & { country?: string }) | null;
  student?: { full_name: string | null } | null;
};

/**
 * Resolves the best display name for an enrollment row, in order of
 * preference: student_details first+last → profile.full_name → email
 * local part. We need this fallback because admin-approved enrollments
 * (paid out-of-band) and bulk-imported rows often have an empty
 * student_details JSON, which used to render as "undefined undefined".
 */
function resolveDisplayName(r: EnrollmentWithDetails): string {
  const d = r.student_details;
  const first = d?.first_name?.trim();
  const last = d?.last_name?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  const profileName = r.student?.full_name?.trim();
  if (profileName) return profileName;
  if (r.applicant_email) return r.applicant_email.split("@")[0];
  return "—";
}

export default async function OfferingStudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the offering
  const { data: offering } = await supabase
    .from("offerings")
    .select("*")
    .eq("id", id)
    .single<Offering>();

  if (!offering) notFound();

  // Fetch all approved enrollments with student details + a profile join
  // so we can fall back to profile.full_name when student_details JSON is
  // empty (e.g. admin-approved rows that skipped the wizard).
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "*, student:profiles!enrollments_student_id_fkey(full_name)"
    )
    .eq("offering_id", id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const rows = (enrollments || []) as EnrollmentWithDetails[];

  return (
    <div>
      {/* Back nav */}
      <LinkButton
        variant="ghost"
        href="/dashboard/admin/offerings"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Offerings
      </LinkButton>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">Enrolled Students</Badge>
            <Badge variant="default">{rows.length} total</Badge>
          </div>
          <h1 className="text-2xl font-bold mb-1">{offering.title}</h1>
          <p className="text-sm text-muted-foreground">
            Approved students for this offering.{" "}
            {rows.length === 0 ? "No one has enrolled yet." : ""}
          </p>
        </div>
        <div className="shrink-0">
          <EnrollDialog offeringId={offering.id} offeringTitle={offering.title} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No enrolled students yet</p>
            <p className="text-sm text-muted-foreground">
              Once enrollments are approved, students will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-left px-4 py-3 font-medium">Phone</th>
                      <th className="text-left px-4 py-3 font-medium">Age</th>
                      <th className="text-left px-4 py-3 font-medium">City / Country</th>
                      <th className="text-left px-4 py-3 font-medium">Education</th>
                      <th className="text-left px-4 py-3 font-medium">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = r.student_details;
                      const fullName = resolveDisplayName(r);
                      const cityCountry = d
                        ? [d.city, d.country].filter(Boolean).join(", ") || "—"
                        : "—";
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{fullName}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.applicant_email || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {d?.phone || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {d?.age || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {cityCountry}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {d?.education_level || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(r.created_at).toLocaleDateString("en-PK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => {
              const d = r.student_details;
              const fullName = resolveDisplayName(r);
              const cityCountry = d
                ? [d.city, d.country].filter(Boolean).join(", ") || "—"
                : "—";
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{fullName}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{r.applicant_email || "—"}</span>
                      </div>
                      {d?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{d.phone}</span>
                        </div>
                      )}
                      {d?.age && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>Age {d.age}</span>
                        </div>
                      )}
                      {cityCountry !== "—" && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{cityCountry}</span>
                        </div>
                      )}
                      {d?.education_level && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                          <span>{d.education_level}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

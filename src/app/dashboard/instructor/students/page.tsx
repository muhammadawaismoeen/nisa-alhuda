/**
 * Student Management — shows enrolled sisters with engagement scores.
 * Engagement is calculated from enrollment tenure and activity signals.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Users,
  User,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";
import { getDashboardViewer } from "@/lib/auth-helpers";
import type { Profile } from "@/lib/types/database";

// Engagement tiers
function getEngagementTier(score: number) {
  if (score >= 80)
    return { label: "Highly Active", color: "text-green-600", bg: "bg-green-100 dark:bg-green-950/30" };
  if (score >= 60)
    return { label: "Active", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30" };
  if (score >= 40)
    return { label: "Moderate", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950/30" };
  return { label: "New", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800/30" };
}

export default async function StudentManagementPage() {
  const supabase = await createClient();
  const viewer = await getDashboardViewer();
  if (!viewer) return null;

  // Admins see every instructor's students; instructors see only their own.
  let subjectsQuery = supabase
    .from("subjects")
    .select("id, title, offering_id");
  if (viewer.instructorScope) {
    subjectsQuery = subjectsQuery.eq("instructor_id", viewer.instructorScope);
  }
  const { data: subjects } = await subjectsQuery;

  if (!subjects || subjects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Students</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enrolled sisters and their engagement.
        </p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              {viewer.isAdmin
                ? "No subjects in the system yet"
                : "No subjects assigned yet"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get unique offering IDs
  const offeringIds = [...new Set(subjects.map((s) => s.offering_id))];

  // Fetch approved enrollments for these offerings
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("*, student:profiles!enrollments_student_id_fkey(*), offering:offerings!enrollments_offering_id_fkey(id, title)")
    .in("offering_id", offeringIds)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (enrollError) {
    console.error("Error fetching enrollments:", enrollError.message);
  }

  // Build student data with engagement scores
  const now = new Date();

  // Count enrollments per student (across all offerings) for multi-enrollment bonus
  const enrollmentCountByStudent: Record<string, number> = {};
  (enrollments || []).forEach((e: any) => {
    const sid = e.student_id;
    enrollmentCountByStudent[sid] = (enrollmentCountByStudent[sid] || 0) + 1;
  });

  // Deduplicate students (a student may be enrolled in multiple offerings)
  const seenStudents = new Set<string>();
  const students = (enrollments || [])
    .filter((e: any) => {
      if (seenStudents.has(e.student_id)) return false;
      seenStudents.add(e.student_id);
      return true;
    })
    .map((enrollment: any) => {
      const student = enrollment.student as Profile;
      const enrolledAt = new Date(enrollment.created_at);
      const tenureDays = Math.floor(
        (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Engagement Score (0-100)
      // Base: 40 (approved enrollment)
      // Tenure: up to 30 (scaled over 90 days)
      // Profile: +10 if phone, +10 if multiple enrollments
      // Activity proxy: +10 if enrolled early (within first 7 days of offering)
      const tenureBonus = Math.min(30, Math.round((tenureDays / 90) * 30));
      const phoneBonus = student.phone ? 10 : 0;
      const multiBonus =
        (enrollmentCountByStudent[enrollment.student_id] || 1) > 1 ? 10 : 0;
      const earlyBonus = tenureDays > 7 ? 10 : 5;

      const score = Math.min(
        100,
        40 + tenureBonus + phoneBonus + multiBonus + earlyBonus
      );

      return {
        id: student.id,
        name: student.full_name,
        phone: student.phone,
        enrolledAt: enrollment.created_at,
        offeringTitle: enrollment.offering?.title,
        enrollmentCount: enrollmentCountByStudent[enrollment.student_id] || 1,
        tenureDays,
        score,
      };
    })
    .sort((a: any, b: any) => b.score - a.score);

  // Stats
  const avgScore =
    students.length > 0
      ? Math.round(
          students.reduce((sum: number, s: any) => sum + s.score, 0) /
            students.length
        )
      : 0;

  const highlyActive = students.filter((s: any) => s.score >= 80).length;

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Students"
        subtitle="Enrolled sisters in your subjects, with their engagement scores."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Engagement</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{highlyActive}</p>
              <p className="text-xs text-muted-foreground">Highly Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No enrolled students yet
            </p>
            <p className="text-sm text-muted-foreground">
              Students will appear here once their enrollment is approved.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student: any) => {
            const tier = getEngagementTier(student.score);
            return (
              <Card key={student.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>

                    {/* Student info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {student.name}
                        </h3>
                        <Badge variant="outline" className={`text-xs ${tier.color}`}>
                          {tier.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {student.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {student.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Enrolled{" "}
                          {new Date(student.enrolledAt).toLocaleDateString(
                            "en-PK",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {student.offeringTitle}
                        </span>
                      </div>
                    </div>

                    {/* Engagement score */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className={`h-3.5 w-3.5 ${tier.color}`} />
                          <span className="text-lg font-bold">
                            {student.score}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Engagement
                        </p>
                      </div>
                      {/* Score bar */}
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            student.score >= 80
                              ? "bg-green-500"
                              : student.score >= 60
                                ? "bg-blue-500"
                                : student.score >= 40
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                          }`}
                          style={{ width: `${student.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

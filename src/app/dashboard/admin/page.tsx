/**
 * Admin Dashboard — bento-box system stats overview.
 * Shows total enrolled sisters, revenue, active sessions, storage, and more.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Users,
  LayoutDashboard,
  DollarSign,
  Video,
  BookOpen,
  ClipboardList,
  ArrowRight,
  Clock,
  CheckCircle,
  UserPlus,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch all data in parallel
  const [
    offeringsRes,
    studentsRes,
    enrollmentsRes,
    pendingRes,
    revenueRes,
    lessonsRes,
    profilesRes,
    recentEnrollmentsRes,
  ] = await Promise.all([
    supabase.from("offerings").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student"),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("enrollments")
      .select("payment_amount, payment_currency")
      .eq("status", "approved"),
    supabase
      .from("lessons")
      .select("id, scheduled_at, is_published", { count: "exact" }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("enrollments")
      .select("*, student:profiles!enrollments_student_id_fkey(full_name), offering:offerings!enrollments_offering_id_fkey(title)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalStudents = studentsRes.count || 0;
  const activeEnrollments = enrollmentsRes.count || 0;
  const pendingApprovals = pendingRes.count || 0;
  const totalOfferings = offeringsRes.count || 0;
  const totalUsers = profilesRes.count || 0;

  // Calculate total revenue — sum PKR + INR (shown together), track USD separately
  const totalRevenue = (revenueRes.data || [])
    .filter(
      (e) =>
        !e.payment_currency ||
        e.payment_currency.toUpperCase() === "PKR" ||
        e.payment_currency.toUpperCase() === "INR"
    )
    .reduce((sum, e) => sum + (e.payment_amount || 0), 0);
  const totalRevenueUsd = (revenueRes.data || [])
    .filter((e) => (e.payment_currency || "").toUpperCase() === "USD")
    .reduce((sum, e) => sum + (e.payment_amount || 0), 0);

  // Active live sessions: lessons scheduled within ±1 hour of now
  const now = new Date();
  const activeSessions = (lessonsRes.data || []).filter((l: any) => {
    if (!l.scheduled_at) return false;
    const diff = Math.abs(
      new Date(l.scheduled_at).getTime() - now.getTime()
    );
    return diff < 60 * 60 * 1000; // within 1 hour
  }).length;

  // Total lessons count
  const totalLessons = lessonsRes.count || 0;

  const recentEnrollments = recentEnrollmentsRes.data || [];

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Admin"
        title="System overview"
        subtitle="Live snapshot of enrollments, revenue, sessions, and storage."
        actions={
          pendingApprovals > 0 ? (
            <LinkButton
              href="/dashboard/admin/payments"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Clock className="h-4 w-4 mr-1.5" />
              {pendingApprovals} Pending
            </LinkButton>
          ) : null
        }
      />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Enrolled Sisters */}
        <Card className="hover-lift sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                Enrolled Sisters
              </p>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeEnrollments} active enrollment{activeEnrollments !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="hover-lift sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </p>
              <div className="h-9 w-9 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              Rs. {totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              from approved enrollments
              {totalRevenueUsd > 0 && (
                <span className="ml-1">
                  + ${totalRevenueUsd.toLocaleString()}
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Active Live Sessions */}
        <Card className="hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                Active Sessions
              </p>
              <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                <Video className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{activeSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              live right now
            </p>
          </CardContent>
        </Card>

        {/* Total Lessons */}
        <Card className="hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                Total Lessons
              </p>
              <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{totalLessons}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(lessonsRes.data || []).filter((l: any) => l.is_published).length} published
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Quick Stats + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Links */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Total Offerings
                </span>
                <span className="font-bold">{totalOfferings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Total Users
                </span>
                <span className="font-bold">{totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Published Lessons
                </span>
                <span className="font-bold">
                  {(lessonsRes.data || []).filter((l: any) => l.is_published).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Approvals
                </span>
                <span className="font-bold text-amber-600">
                  {pendingApprovals}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-sm">
                Recent Enrollments
              </h3>
              <LinkButton
                variant="ghost"
                size="sm"
                href="/dashboard/admin/enrollments"
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </LinkButton>
            </div>

            {recentEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No enrollments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEnrollments.map((enrollment: any) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30"
                  >
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {enrollment.student?.full_name || (() => { const d = enrollment.student_details as any; return d?.first_name ? `${d.first_name} ${d.last_name || ""}`.trim() : (enrollment.applicant_email || "Unknown"); })()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {enrollment.offering?.title}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={
                          enrollment.status === "approved"
                            ? "default"
                            : enrollment.status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {enrollment.status === "approved" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {enrollment.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(enrollment.created_at).toLocaleDateString(
                          "en-PK",
                          { day: "numeric", month: "short" }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

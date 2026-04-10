/**
 * User Directory — searchable list of all users with admin actions.
 * Features: search, role filter, login-as-user, ban/suspend.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { UserDirectory } from "./user-directory";
import type { Profile } from "@/lib/types/database";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <p className="text-destructive font-medium">Access denied.</p>
      </div>
    );
  }

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Get enrollment counts per student
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, status");

  const enrollmentCounts: Record<string, { total: number; approved: number }> = {};
  (enrollments || []).forEach((e: any) => {
    if (!enrollmentCounts[e.student_id]) {
      enrollmentCounts[e.student_id] = { total: 0, approved: 0 };
    }
    enrollmentCounts[e.student_id].total++;
    if (e.status === "approved") enrollmentCounts[e.student_id].approved++;
  });

  const roleStats = {
    admin: (profiles || []).filter((p: any) => p.role === "admin").length,
    instructor: (profiles || []).filter((p: any) => p.role === "instructor").length,
    student: (profiles || []).filter((p: any) => p.role === "student").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all students and teachers.
        </p>
      </div>

      {/* Role stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge variant="outline" className="text-sm py-1 px-3">
          {(profiles || []).length} total users
        </Badge>
        <Badge variant="default" className="text-sm py-1 px-3">
          {roleStats.student} students
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3 text-blue-600 border-blue-300">
          {roleStats.instructor} instructors
        </Badge>
        <Badge variant="outline" className="text-sm py-1 px-3 text-purple-600 border-purple-300">
          {roleStats.admin} admins
        </Badge>
      </div>

      <UserDirectory
        profiles={(profiles as Profile[]) || []}
        enrollmentCounts={enrollmentCounts}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}

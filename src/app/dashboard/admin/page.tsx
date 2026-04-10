/**
 * Admin Dashboard — overview with key stats.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, ClipboardList, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/constants";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch counts in parallel for performance
  const [offeringsRes, studentsRes, enrollmentsRes, pendingRes] =
    await Promise.all([
      supabase
        .from("offerings")
        .select("*", { count: "exact", head: true }),
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
    ]);

  const stats = [
    {
      label: "Total Offerings",
      value: offeringsRes.count || 0,
      icon: BookOpen,
    },
    {
      label: "Registered Students",
      value: studentsRes.count || 0,
      icon: Users,
    },
    {
      label: "Active Enrollments",
      value: enrollmentsRes.count || 0,
      icon: ClipboardList,
    },
    {
      label: "Pending Approvals",
      value: pendingRes.count || 0,
      icon: DollarSign,
      highlight: (pendingRes.count || 0) > 0,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={stat.highlight ? "border-primary" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

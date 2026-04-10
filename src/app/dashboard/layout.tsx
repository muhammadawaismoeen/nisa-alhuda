/**
 * Dashboard layout — shared wrapper for all authenticated dashboard pages.
 * Verifies auth and provides the sidebar navigation.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Settings,
  Users,
  ClipboardList,
  Video,
  FileText,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { Logo } from "@/components/layout/logo";
import { APP_NAME } from "@/lib/constants";
import type { Profile } from "@/lib/types/database";
import { DashboardLogout } from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  // Build navigation based on role
  const navItems = getNavItems(profile.role);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
        <div className="p-4 border-b">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <LinkButton
              key={item.href}
              variant="ghost"
              className="w-full justify-start gap-3"
              href={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </LinkButton>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile.role}
            </p>
          </div>
          <DashboardLogout />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b p-4">
          <Logo size="sm" />
          <span className="text-sm text-muted-foreground capitalize">
            {profile.role}
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function getNavItems(role: string) {
  const base = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
  ];

  if (role === "admin") {
    return [
      ...base,
      { href: "/dashboard/admin/offerings", label: "Offerings", icon: BookOpen },
      { href: "/dashboard/admin/enrollments", label: "Enrollments", icon: ClipboardList },
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
    ];
  }

  if (role === "instructor") {
    return [
      ...base,
      { href: "/dashboard/instructor", label: "My Subjects", icon: BookOpen },
      { href: "/dashboard/instructor/live", label: "Live Hub", icon: Video },
      { href: "/dashboard/instructor/students", label: "Students", icon: Users },
      { href: "/dashboard/instructor/resources", label: "Resources", icon: FileText },
      { href: "/dashboard/instructor/analytics", label: "Analytics", icon: BarChart3 },
    ];
  }

  // Student
  return [
    ...base,
    { href: "/dashboard/student", label: "My Learning", icon: GraduationCap },
    { href: "/dashboard/student/enrollments", label: "Enrollments", icon: ClipboardList },
  ];
}

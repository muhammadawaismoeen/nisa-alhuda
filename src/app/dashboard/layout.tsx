/**
 * Dashboard layout — shared wrapper for all authenticated dashboard pages.
 * Verifies auth and provides sidebar navigation + mobile drawer.
 */
import { redirect } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Settings,
  Users,
  ClipboardList,
  Video,
  FileText,
  BarChart3,
  Megaphone,
  Mail,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/link-button";
import { Logo } from "@/components/layout/logo";
import type { Profile } from "@/lib/types/database";
import { DashboardLogout } from "./logout-button";
import { NotificationBell } from "./notification-bell";
import { MobileNav } from "./mobile-nav";

// Icon map for serializing nav items to client component
const iconMap = {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Users,
  Megaphone,
  Mail,
  Settings,
  Video,
  FileText,
  BarChart3,
};

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

  // Serialize nav items for client MobileNav (icon name strings)
  const serializedNavItems = navItems.map((item) => ({
    href: item.href,
    label: item.label,
    iconName: item.icon.displayName || item.icon.name || "LayoutDashboard",
  }));

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30 shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <Logo size="sm" />
          <NotificationBell userId={profile.id} />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-background sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <MobileNav
              navItems={serializedNavItems}
              fullName={profile.full_name}
              role={profile.role}
            />
            <Logo size="sm" />
          </div>
          <NotificationBell userId={profile.id} />
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
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
      { href: "/dashboard/admin/offerings", label: "Courses", icon: BookOpen },
      { href: "/dashboard/admin/payments", label: "Payments", icon: ClipboardList },
      { href: "/dashboard/admin/enrollments", label: "Enrollments", icon: GraduationCap },
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
      { href: "/dashboard/admin/emails", label: "Emails", icon: Mail },
      { href: "/dashboard/admin/credentials", label: "Credentials", icon: KeyRound },
      { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ];
  }

  // Treasurers only see the payment ledger (plus base dashboard + settings).
  // Their admin layout guard bounces them out of any other /dashboard/admin/* path.
  if (role === "treasurer") {
    return [
      ...base,
      { href: "/dashboard/admin/payments", label: "Payments", icon: ClipboardList },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
      { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ];
  }

  // Student
  return [
    ...base,
    { href: "/dashboard/student", label: "My Learning", icon: GraduationCap },
    { href: "/dashboard/student/live", label: "Live Sessions", icon: Video },
    { href: "/dashboard/student/enrollments", label: "Enrollments", icon: ClipboardList },
    { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];
}

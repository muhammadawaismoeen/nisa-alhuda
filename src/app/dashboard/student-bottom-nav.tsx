"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Video,
} from "lucide-react";

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/student",
    label: "Learning",
    icon: GraduationCap,
    exact: true,
  },
  {
    href: "/dashboard/student/schedule",
    label: "Schedule",
    icon: CalendarDays,
    exact: false,
  },
  {
    href: "/dashboard/student/live",
    label: "Live",
    icon: Video,
    exact: false,
  },
] as const;

export function StudentBottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      aria-label="Student navigation"
    >
      {/* Subtle top shadow to lift bar off content */}
      <div className="border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="grid grid-cols-4">
          {TABS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-h-[56px] ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 transition-transform ${
                    active ? "scale-110" : ""
                  }`}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
        {/* iOS safe area */}
        <div className="h-safe-area-bottom" />
      </div>
    </nav>
  );
}

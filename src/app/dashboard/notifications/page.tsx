/**
 * Notifications Page — full list of all notifications for the current user.
 * Grouped by date: Today, Yesterday, Earlier.
 */
import { createClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import { NotificationList } from "./notification-list";
import type { Notification } from "@/lib/types/database";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unreadCount =
    notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg">No notifications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ll see updates about your enrollments and announcements here.
          </p>
        </div>
      ) : (
        <NotificationList
          initialNotifications={notifications as Notification[]}
          userId={user.id}
        />
      )}
    </div>
  );
}

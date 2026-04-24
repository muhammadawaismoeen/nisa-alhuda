/**
 * Notifications Page — full list of all notifications for the current user.
 * Grouped by date: Today, Yesterday, Earlier.
 */
import { createClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";
import { NotificationList } from "./notification-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
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
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
            : "You're all caught up."
        }
      />

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You'll see updates about your enrollments and announcements here."
        />
      ) : (
        <NotificationList
          initialNotifications={notifications as Notification[]}
          userId={user.id}
        />
      )}
    </div>
  );
}

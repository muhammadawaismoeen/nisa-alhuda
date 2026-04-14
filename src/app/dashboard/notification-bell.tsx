/**
 * Notification Bell — shows unread count badge with dropdown of recent notifications.
 * Uses Supabase Realtime to update count in real-time.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  BookOpen,
  Megaphone,
  Info,
  Check,
  ExternalLink,
  HeartHandshake,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationType } from "@/lib/types/database";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string }
> = {
  enrollment_approved: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-950/30",
  },
  enrollment_rejected: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-950/30",
  },
  fa_approved: {
    icon: HeartHandshake,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-950/30",
  },
  fa_rejected: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-950/30",
  },
  new_lesson: {
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-950/30",
  },
  new_announcement: {
    icon: Megaphone,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-950/30",
  },
  general: {
    icon: Info,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch unread count on mount + set up realtime
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      // Fetch initial unread count
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false);
        setUnreadCount(count || 0);
      } catch {
        // Table may not exist yet
        setUnreadCount(0);
      }

      // Subscribe to realtime inserts
      try {
        channel = supabase.channel(`notif-bell-${userId}`);
        channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            setUnreadCount((c) => c + 1);
          }
        );
        channel.subscribe();
      } catch {
        // Realtime may not be available
      }
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 min-w-4.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 md:right-auto md:left-0 top-full mt-2 w-80 sm:w-96 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = typeConfig[n.type] || typeConfig.general;
                const Icon = config.icon;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${!n.is_read ? "font-semibold" : "font-medium"}`}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 bg-muted/30">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/notifications");
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
            >
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Notification List — client component for interactive notification management.
 * Mark as read, mark all read, grouped by date.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  BookOpen,
  Megaphone,
  Info,
  Check,
  Trash2,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];

  notifications.forEach((n) => {
    const date = new Date(n.created_at);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (date.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  });

  return groups.filter((g) => g.items.length > 0);
}

interface NotificationListProps {
  initialNotifications: Notification[];
  userId: string;
}

export function NotificationList({
  initialNotifications,
  userId,
}: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(notifications);

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read.");
  }

  function handleClick(notification: Notification) {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <div>
      {/* Actions bar */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Mark all as read
          </Button>
        </div>
      )}

      {/* Grouped notifications */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map((n) => {
                const config = typeConfig[n.type] || typeConfig.general;
                const Icon = config.icon;

                return (
                  <Card
                    key={n.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${
                      !n.is_read
                        ? "border-primary/20 bg-primary/[0.02]"
                        : "opacity-75"
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
                        >
                          <Icon
                            className={`h-4 w-4 ${config.color}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}
                            >
                              {n.title}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              {!n.is_read && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {new Date(n.created_at).toLocaleTimeString(
                                  "en-PK",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                          {n.body && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {n.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

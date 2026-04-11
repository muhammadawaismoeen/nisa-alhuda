/**
 * Student Live Sessions page.
 * Shows live-now, upcoming, and past sessions for enrolled offerings.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react";
import type { LiveSession, Offering, Profile } from "@/lib/types/database";

export default async function StudentLivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch live sessions (RLS filters to enrolled offerings)
  let sessions: (LiveSession & {
    instructor: Profile;
    offering: Offering;
  })[] = [];

  try {
    const { data } = await supabase
      .from("live_sessions")
      .select("*, instructor:profiles!live_sessions_instructor_id_fkey(*), offering:offerings!live_sessions_offering_id_fkey(*)")
      .order("scheduled_at", { ascending: true });

    sessions = (data as typeof sessions) || [];
  } catch {
    // Table may not exist before migration
  }

  const now = new Date();

  const live = sessions.filter((s) => {
    const start = new Date(s.scheduled_at);
    const end = new Date(start.getTime() + s.duration_minutes * 60 * 1000);
    return now >= start && now <= end;
  });

  const upcoming = sessions.filter((s) => new Date(s.scheduled_at) > now);

  const past = sessions
    .filter((s) => {
      const start = new Date(s.scheduled_at);
      const end = new Date(start.getTime() + s.duration_minutes * 60 * 1000);
      return now > end;
    })
    .reverse()
    .slice(0, 20);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Join live classes and view your schedule.
        </p>
      </div>

      {/* Live Now */}
      {live.length > 0 && (
        <section className="mb-6">
          <div className="space-y-3">
            {live.map((session) => {
              const startedAgo = Math.floor(
                (now.getTime() - new Date(session.scheduled_at).getTime()) /
                  (1000 * 60)
              );
              return (
                <Card
                  key={session.id}
                  className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                            <Video className="h-5 w-5 text-red-600" />
                          </div>
                          <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
                              <span className="text-[8px] text-white font-bold">
                                LIVE
                              </span>
                            </span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg">
                            {session.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {session.instructor?.full_name} &middot;{" "}
                            {session.offering?.title} &middot; Started{" "}
                            {startedAgo}m ago
                          </p>
                          {session.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {session.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors press shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Now
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      <section className="mb-8">
        <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Sessions
          {upcoming.length > 0 && (
            <Badge variant="outline">{upcoming.length}</Badge>
          )}
        </h2>

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-1">
                No upcoming sessions
              </p>
              <p className="text-sm text-muted-foreground">
                Your instructors will schedule live sessions here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((session) => {
              const scheduled = new Date(session.scheduled_at);
              const diffMs = scheduled.getTime() - now.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffDays = Math.floor(diffHours / 24);

              let timeLabel = "";
              if (diffDays > 0) {
                timeLabel = `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
              } else if (diffHours > 0) {
                timeLabel = `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
              } else {
                const diffMins = Math.floor(diffMs / (1000 * 60));
                timeLabel = `in ${diffMins} min`;
              }

              return (
                <Card
                  key={session.id}
                  className="border-blue-200/60 dark:border-blue-800/60"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {session.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-300 shrink-0"
                          >
                            {timeLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {session.instructor?.full_name} &middot;{" "}
                          {session.offering?.title} &middot;{" "}
                          {scheduled.toLocaleDateString("en-PK", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          &middot; {session.duration_minutes}m
                        </p>
                        {session.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={session.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Join
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      {past.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            Past Sessions
          </h2>
          <div className="space-y-2">
            {past.map((session) => {
              const scheduled = new Date(session.scheduled_at);
              return (
                <Card key={session.id} className="opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {session.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {session.instructor?.full_name} &middot;{" "}
                          {scheduled.toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

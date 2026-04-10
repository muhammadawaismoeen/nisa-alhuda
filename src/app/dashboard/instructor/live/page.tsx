/**
 * Live Hub — instructor view for managing live sessions and recording uploads.
 * Shows upcoming scheduled sessions and lessons pending recording uploads.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Clock,
  ExternalLink,
  AlertCircle,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { RecordingUpdater } from "./recording-updater";
import type { Lesson, Subject } from "@/lib/types/database";

export default async function LiveHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch instructor's subjects
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title, offering_id")
    .eq("instructor_id", user.id);

  if (!subjects || subjects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Live Hub</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your live sessions and recording uploads.
        </p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              No subjects assigned yet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjectIds = subjects.map((s) => s.id);
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.title]));

  // Fetch all published lessons for instructor's subjects
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .in("subject_id", subjectIds)
    .order("scheduled_at", { ascending: true });

  const now = new Date();

  // Upcoming sessions: scheduled in the future with a live class link
  const upcoming = (lessons || []).filter(
    (l: Lesson) =>
      l.scheduled_at &&
      new Date(l.scheduled_at) > now &&
      l.live_class_link
  );

  // Pending recordings: scheduled in the past without a recording URL
  const pendingRecordings = (lessons || []).filter(
    (l: Lesson) =>
      l.scheduled_at &&
      new Date(l.scheduled_at) < now &&
      !l.recording_url
  );

  // Recently completed: past lessons WITH recordings (last 10)
  const completed = (lessons || [])
    .filter(
      (l: Lesson) =>
        l.scheduled_at &&
        new Date(l.scheduled_at) < now &&
        l.recording_url
    )
    .slice(-10)
    .reverse();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your live sessions and recording uploads.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRecordings.length}</p>
              <p className="text-xs text-muted-foreground">
                Pending Recordings
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">
                Recordings Uploaded
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <section className="mb-8">
        <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Upcoming Sessions
        </h2>

        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming live sessions scheduled. Add a scheduled date and
                live class link to a lesson to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((lesson: Lesson) => {
              const scheduled = new Date(lesson.scheduled_at!);
              const diffMs = scheduled.getTime() - now.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffDays = Math.floor(diffHours / 24);

              let timeLabel = "";
              if (diffDays > 0) {
                timeLabel = `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
              } else if (diffHours > 0) {
                timeLabel = `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
              } else {
                timeLabel = "starting soon";
              }

              return (
                <Card
                  key={lesson.id}
                  className="border-blue-200 dark:border-blue-800"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {lesson.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-300 shrink-0"
                          >
                            {timeLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {subjectMap[lesson.subject_id || ""] || "General"} &middot;{" "}
                          {scheduled.toLocaleDateString("en-PK", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <a
                        href={lesson.live_class_link!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Start Session
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending Recording Uploads */}
      <section>
        <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          Pending Recording Uploads
          {pendingRecordings.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {pendingRecordings.length}
            </Badge>
          )}
        </h2>

        {pendingRecordings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                All recordings are up to date. Great job!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingRecordings.map((lesson: Lesson) => (
              <Card
                key={lesson.id}
                className="border-amber-200 dark:border-amber-800"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{lesson.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {subjectMap[lesson.subject_id || ""] || "General"}{" "}
                          &middot; Held on{" "}
                          {new Date(lesson.scheduled_at!).toLocaleDateString(
                            "en-PK",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <RecordingUpdater lessonId={lesson.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

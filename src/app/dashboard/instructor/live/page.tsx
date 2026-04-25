/**
 * Live Hub — instructor view for managing live sessions and recording uploads.
 * Two sections: (1) Live Sessions scheduling, (2) Recording uploads for past lessons.
 */
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Video,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { RecordingUpdater } from "./recording-updater";
import { SessionManager } from "./session-manager";
import { getDashboardViewer } from "@/lib/auth-helpers";
import type { Lesson, LiveSession } from "@/lib/types/database";

export default async function LiveHubPage() {
  const supabase = await createClient();
  const viewer = await getDashboardViewer();
  if (!viewer) return null;

  // Admins see every instructor's subjects; instructors see only their own.
  let subjectsQuery = supabase
    .from("subjects")
    .select("id, title, offering_id, instructor_id");
  if (viewer.instructorScope) {
    subjectsQuery = subjectsQuery.eq("instructor_id", viewer.instructorScope);
  }
  const { data: subjects } = await subjectsQuery;

  if (!subjects || subjects.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Live Hub</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {viewer.isAdmin
            ? "No subjects exist yet across any instructor. Create offerings and assign instructors to start scheduling sessions."
            : "Manage your live sessions and recording uploads."}
        </p>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              {viewer.isAdmin
                ? "No subjects in the system yet"
                : "No subjects assigned yet"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjectIds = subjects.map((s) => s.id);
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.title]));

  // Get unique offering IDs from subjects
  const offeringIds = [...new Set(subjects.map((s) => s.offering_id))];

  // Fetch offerings for the session form dropdown.
  // Include instructor_id so the SessionManager can resolve the right
  // instructor when an admin (who is not themselves an instructor) creates
  // a session — admins fall back to the offering's primary instructor.
  const { data: offerings } = await supabase
    .from("offerings")
    .select("id, title, instructor_id")
    .in("id", offeringIds);

  // Fetch live sessions: admins see every session; instructors only their own.
  let sessions: LiveSession[] = [];
  try {
    let q = supabase
      .from("live_sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (viewer.instructorScope) {
      q = q.eq("instructor_id", viewer.instructorScope);
    } else {
      // Admin: only show sessions tied to the offerings we already loaded
      // (avoids dumping unrelated sessions from other workspaces if any).
      q = q.in("offering_id", offeringIds);
    }
    const { data } = await q;
    sessions = (data as LiveSession[]) || [];
  } catch {
    // Table may not exist yet before migration
  }

  // Fetch all published lessons for instructor's subjects (recordings section)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .in("subject_id", subjectIds)
    .order("scheduled_at", { ascending: true });

  const now = new Date();

  // Pending recordings: scheduled in the past without a recording URL
  const pendingRecordings = (lessons || []).filter(
    (l: Lesson) =>
      l.scheduled_at &&
      new Date(l.scheduled_at) < now &&
      !l.recording_url
  );

  // Recently completed: past lessons WITH recordings (last 10)
  const completedRecordings = (lessons || [])
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
      <PageHeader
        icon={Video}
        title="Live Hub"
        subtitle="Schedule live sessions and manage recording uploads for your classes."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sessions.filter(
                  (s) => new Date(s.scheduled_at) > now
                ).length}
              </p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sessions.filter((s) => {
                  const start = new Date(s.scheduled_at);
                  const end = new Date(
                    start.getTime() + s.duration_minutes * 60 * 1000
                  );
                  return now >= start && now <= end;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Live Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRecordings.length}</p>
              <p className="text-xs text-muted-foreground">Pending Rec.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedRecordings.length}</p>
              <p className="text-xs text-muted-foreground">Recordings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Sessions Manager */}
      <SessionManager
        sessions={sessions}
        offerings={offerings || []}
        instructorId={viewer.userId}
        viewerIsAdmin={viewer.isAdmin}
      />

      {/* Divider */}
      <hr className="my-8" />

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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { LiveSession, Offering } from "@/lib/types/database";

interface SessionManagerProps {
  sessions: LiveSession[];
  offerings: Pick<Offering, "id" | "title">[];
  instructorId: string;
}

type SessionStatus = "live" | "upcoming" | "completed";

function getSessionStatus(
  scheduledAt: string,
  durationMinutes: number
): SessionStatus {
  const now = new Date();
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  if (now >= start && now <= end) return "live";
  if (now < start) return "upcoming";
  return "completed";
}

function formatRelativeTime(scheduledAt: string): string {
  const now = new Date();
  const target = new Date(scheduledAt);
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    const ago = Math.abs(diffMins);
    if (ago < 60) return `${ago}m ago`;
    const hoursAgo = Math.abs(diffHours);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${Math.abs(diffDays)}d ago`;
  }
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  return `in ${diffDays}d`;
}

export function SessionManager({
  sessions,
  offerings,
  instructorId,
}: SessionManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offeringId, setOfferingId] = useState(offerings[0]?.id || "");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState("60");

  function resetForm() {
    setTitle("");
    setDescription("");
    setOfferingId(offerings[0]?.id || "");
    setMeetingUrl("");
    setScheduledDate("");
    setScheduledTime("");
    setDuration("60");
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(session: LiveSession) {
    setEditing(session);
    setTitle(session.title);
    setDescription(session.description || "");
    setOfferingId(session.offering_id);
    setMeetingUrl(session.meeting_url);
    const dt = new Date(session.scheduled_at);
    setScheduledDate(dt.toISOString().split("T")[0]);
    setScheduledTime(dt.toTimeString().slice(0, 5));
    setDuration(String(session.duration_minutes));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !meetingUrl.trim() || !scheduledDate || !scheduledTime) {
      toast.error("Please fill all required fields.");
      return;
    }

    try {
      new URL(meetingUrl.trim());
    } catch {
      toast.error("Please enter a valid meeting URL.");
      return;
    }

    const scheduledAt = new Date(
      `${scheduledDate}T${scheduledTime}:00`
    ).toISOString();

    setSaving(true);
    try {
      const supabase = createClient();

      if (editing) {
        const { error } = await supabase
          .from("live_sessions")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            offering_id: offeringId,
            meeting_url: meetingUrl.trim(),
            scheduled_at: scheduledAt,
            duration_minutes: parseInt(duration) || 60,
          })
          .eq("id", editing.id);
        if (error) throw new Error(error.message);
        toast.success("Session updated!");
      } else {
        const { error } = await supabase.from("live_sessions").insert({
          instructor_id: instructorId,
          title: title.trim(),
          description: description.trim() || null,
          offering_id: offeringId,
          meeting_url: meetingUrl.trim(),
          scheduled_at: scheduledAt,
          duration_minutes: parseInt(duration) || 60,
        });
        if (error) throw new Error(error.message);
        toast.success("Session scheduled!");
      }

      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save session."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("live_sessions")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      toast.success("Session deleted.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete session."
      );
    } finally {
      setDeleting(null);
    }
  }

  const offeringMap = Object.fromEntries(
    offerings.map((o) => [o.id, o.title])
  );

  // Group sessions by status
  const live = sessions.filter(
    (s) => getSessionStatus(s.scheduled_at, s.duration_minutes) === "live"
  );
  const upcoming = sessions.filter(
    (s) => getSessionStatus(s.scheduled_at, s.duration_minutes) === "upcoming"
  );
  const completed = sessions
    .filter(
      (s) =>
        getSessionStatus(s.scheduled_at, s.duration_minutes) === "completed"
    )
    .slice(0, 10);

  return (
    <div>
      {/* Schedule Session Button / Form */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          className="mb-6 press"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Schedule Session
        </Button>
      ) : (
        <Card className="mb-6 border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editing ? "Edit Session" : "Schedule New Session"}
              </h3>
              <button
                onClick={resetForm}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">
                    Session Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fiqh of Salah — Chapter 3"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">
                    Description
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Bring your workbooks"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Offering *
                  </label>
                  <select
                    value={offeringId}
                    onChange={(e) => setOfferingId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                    required
                  >
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Meeting URL *
                  </label>
                  <Input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... or meet.google.com/..."
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Time *
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Duration (minutes)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={saving} className="press">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : null}
                  {editing ? "Update Session" : "Schedule Session"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Live Now */}
      {live.length > 0 && (
        <section className="mb-6">
          <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            Live Now
          </h2>
          <div className="space-y-3">
            {live.map((session) => (
              <Card
                key={session.id}
                className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{session.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {offeringMap[session.offering_id] || "Unknown"} &middot; Started{" "}
                        {formatRelativeTime(session.scheduled_at)}
                      </p>
                    </div>
                    <a
                      href={session.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors press shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Join Session
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      <section className="mb-6">
        <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Upcoming Sessions
          {upcoming.length > 0 && (
            <Badge variant="outline">{upcoming.length}</Badge>
          )}
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming sessions. Click &quot;Schedule Session&quot; to create one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((session) => {
              const scheduled = new Date(session.scheduled_at);
              return (
                <Card key={session.id} className="border-blue-200 dark:border-blue-800">
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
                            {formatRelativeTime(session.scheduled_at)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {offeringMap[session.offering_id] || "Unknown"} &middot;{" "}
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
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={session.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                        <button
                          onClick={() => startEdit(session)}
                          className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          disabled={deleting === session.id}
                          className="h-9 w-9 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors text-destructive"
                          title="Delete"
                        >
                          {deleting === session.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Sessions */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2 text-muted-foreground">
            Past Sessions
            <Badge variant="outline">{completed.length}</Badge>
          </h2>
          <div className="space-y-2">
            {completed.map((session) => {
              const scheduled = new Date(session.scheduled_at);
              return (
                <Card key={session.id} className="opacity-70">
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
                          {offeringMap[session.offering_id] || "Unknown"} &middot;{" "}
                          {scheduled.toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting === session.id}
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-destructive shrink-0"
                        title="Delete"
                      >
                        {deleting === session.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
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

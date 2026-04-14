/**
 * Announcement Manager — create, pin/unpin, delete announcements.
 * Admins/instructors get full management; students see read-only cards.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Pin,
  PinOff,
  Trash2,
  Plus,
  Loader2,
  Globe,
  BookOpen,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AnnouncementManagerProps {
  announcements: any[];
  offerings: { id: string; title: string }[];
  canManage: boolean;
  currentUserId: string;
  isAdmin: boolean;
}

export function AnnouncementManager({
  announcements,
  offerings,
  canManage,
  currentUserId,
  isAdmin,
}: AnnouncementManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setBody("");
    setOfferingId("");
  }

  async function handleCreate() {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and body.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("announcements").insert({
        author_id: currentUserId,
        title: title.trim(),
        body: body.trim(),
        offering_id: offeringId || null,
      });

      if (error) throw new Error(error.message);

      toast.success("Announcement posted! Notifications sent to students.");
      // Fire-and-forget email to enrolled students
      fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "announcement",
          announcementTitle: title.trim(),
          announcementBody: body.trim(),
          offeringId: offeringId || null,
        }),
      }).catch(() => {});
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to post announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePin(id: string, currentlyPinned: boolean) {
    setActionLoading(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: !currentlyPinned })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentlyPinned ? "Announcement unpinned." : "Announcement pinned.");
      router.refresh();
    } catch {
      toast.error("Failed to update announcement.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setActionLoading(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Announcement deleted.");
      router.refresh();
    } catch {
      toast.error("Failed to delete announcement.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      {/* Create button for admins/instructors */}
      {canManage && (
        <div className="mb-6">
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press">
              <Plus className="h-4 w-4 mr-1.5" />
              New Announcement
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Post Announcement</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Exam schedule updated"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none resize-y"
                    placeholder="Write your announcement..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                    value={offeringId}
                    onChange={(e) => setOfferingId(e.target.value)}
                  >
                    <option value="">All Users (Global)</option>
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {offeringId
                      ? "Only enrolled students of this course will be notified."
                      : "All users will be notified."}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Megaphone className="h-4 w-4 mr-2" />
                    )}
                    Post Announcement
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Announcements feed */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg">No announcements yet</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-1">
              Post your first announcement to reach students.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => {
            const canEdit =
              canManage && (a.author_id === currentUserId || isAdmin);

            return (
              <Card
                key={a.id}
                className={a.is_pinned ? "border-primary/30 bg-primary/[0.02]" : ""}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="h-4.5 w-4.5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{a.title}</h3>
                            {a.is_pinned && (
                              <Badge
                                variant="outline"
                                className="text-xs text-primary border-primary/30"
                              >
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            {a.offering ? (
                              <Badge variant="outline" className="text-xs">
                                <BookOpen className="h-3 w-3 mr-1" />
                                {a.offering.title}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                All Users
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {a.author?.full_name || "Unknown"}
                            </span>
                            <span>
                              {new Date(a.created_at).toLocaleDateString(
                                "en-PK",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                }
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Admin/author actions */}
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                handleTogglePin(a.id, a.is_pinned)
                              }
                              disabled={actionLoading === a.id}
                              title={
                                a.is_pinned ? "Unpin" : "Pin announcement"
                              }
                            >
                              {a.is_pinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(a.id)}
                              disabled={actionLoading === a.id}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete announcement"
                            >
                              {actionLoading === a.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {a.body}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

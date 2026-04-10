/**
 * Lesson List — instructor view with add/edit/delete capabilities.
 * Client Component: manages lesson CRUD with inline editing.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Video,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LessonForm } from "./lesson-form";
import type { Lesson } from "@/lib/types/database";

interface LessonListProps {
  subjectId: string;
  offeringId: string;
  lessons: Lesson[];
}

export function LessonList({
  subjectId,
  offeringId,
  lessons: initialLessons,
}: LessonListProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleAddNew() {
    setEditingLesson(null);
    setShowForm(true);
  }

  function handleEdit(lesson: Lesson) {
    setEditingLesson(lesson);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingLesson(null);
    router.refresh();
  }

  async function handleTogglePublish(lesson: Lesson) {
    setTogglingId(lesson.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lessons")
        .update({ is_published: !lesson.is_published })
        .eq("id", lesson.id);

      if (error) throw error;

      toast.success(
        lesson.is_published ? "Lesson unpublished" : "Lesson published"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update lesson.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(lessonId: string) {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    setDeletingId(lessonId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      toast.success("Lesson deleted.");
      router.refresh();
    } catch {
      toast.error("Failed to delete lesson.");
    } finally {
      setDeletingId(null);
    }
  }

  // Show lesson form
  if (showForm) {
    return (
      <LessonForm
        subjectId={subjectId}
        offeringId={offeringId}
        lesson={editingLesson}
        nextSortOrder={initialLessons.length + 1}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg">
          Lessons ({initialLessons.length})
        </h2>
        <Button onClick={handleAddNew} className="press">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Lesson
        </Button>
      </div>

      {initialLessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No lessons yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first lesson to get started.
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initialLessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              className={!lesson.is_published ? "opacity-70" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Order indicator */}
                  <div className="flex items-center gap-1 pt-1 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs font-mono w-5 text-center">
                      {index + 1}
                    </span>
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{lesson.title}</h3>
                      {lesson.is_published ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </div>

                    {lesson.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {lesson.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {lesson.scheduled_at && (
                        <span>
                          Scheduled:{" "}
                          {new Date(lesson.scheduled_at).toLocaleDateString(
                            "en-PK",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                      {lesson.live_class_link && (
                        <span className="flex items-center gap-1 text-primary">
                          <Link2 className="h-3 w-3" />
                          Live link set
                        </span>
                      )}
                      {lesson.recording_url && (
                        <span className="flex items-center gap-1 text-primary">
                          <Video className="h-3 w-3" />
                          Recording added
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle Publish */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleTogglePublish(lesson)}
                      disabled={togglingId === lesson.id}
                      title={
                        lesson.is_published ? "Unpublish" : "Publish"
                      }
                    >
                      {togglingId === lesson.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : lesson.is_published ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(lesson)}
                      title="Edit lesson"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(lesson.id)}
                      disabled={deletingId === lesson.id}
                      title="Delete lesson"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === lesson.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

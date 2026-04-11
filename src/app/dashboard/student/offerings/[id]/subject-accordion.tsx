/**
 * Subject Accordion — expandable subject sections with lesson cards.
 * Students can view lesson details, join live classes, watch recordings,
 * and mark lessons as complete with progress tracking.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Video,
  Calendar,
  PlayCircle,
  BookOpen,
  User,
  CheckCircle,
  Circle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Subject, Lesson } from "@/lib/types/database";

interface SubjectAccordionProps {
  subjects: (Subject & { instructor: { full_name: string } | null })[];
  lessonsBySubject: Record<string, Lesson[]>;
  completedLessonIds: string[];
  offeringId: string;
}

export function SubjectAccordion({
  subjects,
  lessonsBySubject,
  completedLessonIds,
  offeringId,
}: SubjectAccordionProps) {
  const router = useRouter();
  // Local state for optimistic updates
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(completedLessonIds)
  );
  const [loadingLesson, setLoadingLesson] = useState<string | null>(null);

  // Open the first subject by default
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(
    new Set(subjects.length > 0 ? [subjects[0].id] : [])
  );

  function toggleSubject(id: string) {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function toggleComplete(lessonId: string) {
    const isCompleted = completedSet.has(lessonId);
    setLoadingLesson(lessonId);

    // Optimistic update
    setCompletedSet((prev) => {
      const next = new Set(prev);
      if (isCompleted) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      if (isCompleted) {
        // Un-mark: delete the progress record
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("student_id", user.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      } else {
        // Mark complete: insert progress record
        const { error } = await supabase.from("lesson_progress").insert({
          student_id: user.id,
          lesson_id: lessonId,
          offering_id: offeringId,
        });
        if (error) throw error;
      }

      router.refresh();
    } catch {
      // Revert optimistic update
      setCompletedSet((prev) => {
        const next = new Set(prev);
        if (isCompleted) {
          next.add(lessonId);
        } else {
          next.delete(lessonId);
        }
        return next;
      });
      toast.error("Failed to update progress.");
    } finally {
      setLoadingLesson(null);
    }
  }

  // Calculate per-subject progress
  function getSubjectProgress(subjectId: string) {
    const lessons = lessonsBySubject[subjectId] || [];
    if (lessons.length === 0) return { completed: 0, total: 0, pct: 0 };
    const completed = lessons.filter((l) => completedSet.has(l.id)).length;
    return {
      completed,
      total: lessons.length,
      pct: Math.round((completed / lessons.length) * 100),
    };
  }

  return (
    <div className="space-y-4">
      {subjects.map((subject) => {
        const lessons = lessonsBySubject[subject.id] || [];
        const isOpen = openSubjects.has(subject.id);
        const progress = getSubjectProgress(subject.id);

        return (
          <Card key={subject.id}>
            {/* Subject Header — clickable */}
            <button
              onClick={() => toggleSubject(subject.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
            >
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold truncate">
                    {subject.title}
                  </h3>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {lessons.length}{" "}
                    {lessons.length === 1 ? "lesson" : "lessons"}
                  </Badge>
                  {progress.total > 0 && progress.pct === 100 && (
                    <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 shrink-0">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {subject.instructor && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {subject.instructor.full_name}
                    </p>
                  )}
                  {progress.total > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {progress.completed}/{progress.total} done
                    </p>
                  )}
                </div>

                {/* Subject progress bar */}
                {progress.total > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                )}
              </div>

              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Subject Description + Lessons */}
            {isOpen && (
              <CardContent className="pt-0 pb-4 px-4">
                {subject.description && (
                  <p className="text-sm text-muted-foreground mb-4 ml-12">
                    {subject.description}
                  </p>
                )}

                {lessons.length === 0 ? (
                  <div className="ml-12 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Lessons coming soon for this subject.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 ml-3">
                    {lessons.map((lesson, lessonIndex) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        index={lessonIndex + 1}
                        isCompleted={completedSet.has(lesson.id)}
                        isLoading={loadingLesson === lesson.id}
                        onToggleComplete={() => toggleComplete(lesson.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function LessonCard({
  lesson,
  index,
  isCompleted,
  isLoading,
  onToggleComplete,
}: {
  lesson: Lesson;
  index: number;
  isCompleted: boolean;
  isLoading: boolean;
  onToggleComplete: () => void;
}) {
  const now = new Date();
  const scheduledAt = lesson.scheduled_at
    ? new Date(lesson.scheduled_at)
    : null;
  const isUpcoming = scheduledAt ? scheduledAt > now : false;
  const isPast = scheduledAt ? scheduledAt < now : false;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        isCompleted
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900/30"
          : "bg-background hover:bg-muted/20"
      }`}
    >
      {/* Completion toggle */}
      <button
        onClick={onToggleComplete}
        disabled={isLoading}
        className="mt-0.5 shrink-0 transition-colors"
        title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        ) : isCompleted ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/40 hover:text-primary" />
        )}
      </button>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-sm mb-1 ${
            isCompleted ? "text-muted-foreground line-through" : ""
          }`}
        >
          {lesson.title}
        </h4>

        {lesson.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {lesson.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {scheduledAt.toLocaleDateString("en-PK", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {isUpcoming && (
            <Badge
              variant="outline"
              className="text-xs text-amber-600 border-amber-300"
            >
              Upcoming
            </Badge>
          )}
          {isPast && lesson.recording_url && (
            <Badge
              variant="outline"
              className="text-xs text-green-600 border-green-300"
            >
              Recording Available
            </Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live class link */}
        {lesson.live_class_link && isUpcoming && (
          <a
            href={lesson.live_class_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors press"
          >
            <Video className="h-3 w-3" />
            Join
          </a>
        )}

        {/* Recording link */}
        {lesson.recording_url && (
          <a
            href={lesson.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <PlayCircle className="h-3 w-3" />
            Watch
          </a>
        )}
      </div>
    </div>
  );
}

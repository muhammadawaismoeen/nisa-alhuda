/**
 * Subject Accordion — expandable subject sections with lesson cards.
 * Students can view lesson details, join live classes, and watch recordings.
 */
"use client";

import { useState } from "react";
import {
  ChevronDown,
  Video,
  ExternalLink,
  Calendar,
  PlayCircle,
  BookOpen,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Subject, Lesson } from "@/lib/types/database";

interface SubjectAccordionProps {
  subjects: (Subject & { instructor: { full_name: string } | null })[];
  lessonsBySubject: Record<string, Lesson[]>;
}

export function SubjectAccordion({
  subjects,
  lessonsBySubject,
}: SubjectAccordionProps) {
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

  return (
    <div className="space-y-4">
      {subjects.map((subject, subjectIndex) => {
        const lessons = lessonsBySubject[subject.id] || [];
        const isOpen = openSubjects.has(subject.id);

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
                </div>
                {subject.instructor && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />
                    {subject.instructor.full_name}
                  </p>
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

function LessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const now = new Date();
  const scheduledAt = lesson.scheduled_at
    ? new Date(lesson.scheduled_at)
    : null;
  const isUpcoming = scheduledAt ? scheduledAt > now : false;
  const isPast = scheduledAt ? scheduledAt < now : false;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/20 transition-colors">
      {/* Lesson number */}
      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-xs font-mono font-medium shrink-0 mt-0.5">
        {index}
      </div>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm mb-1">{lesson.title}</h4>

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

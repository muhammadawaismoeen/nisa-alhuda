/**
 * Resource helpers — shared between instructor and student views.
 *
 * The "Resources" lesson convention:
 *   A lesson with NO scheduled_at AND NO live_class_link is treated as
 *   a pure resource holder (e.g. "Course Materials & Planner") rather
 *   than an actual class. Its attached files surface under a top-level
 *   "Resources" section on the subject page; the lesson card itself is
 *   not shown.
 *
 *   This is a heuristic, not a column flag — it lets the upload script
 *   work without a migration AND lets instructors create resources-only
 *   "lessons" simply by leaving the schedule + live-link blank.
 */
import type { Lesson } from "@/lib/types/database";

export function isResourcesOnly(lesson: Pick<Lesson, "scheduled_at" | "live_class_link">): boolean {
  return !lesson.scheduled_at && !lesson.live_class_link;
}

/**
 * Partition a list of lessons into:
 *   - resourceLessons: pure-resource holders (Resources section)
 *   - classLessons:    real classes with a schedule and/or live link
 */
export function partitionLessons<L extends Pick<Lesson, "scheduled_at" | "live_class_link">>(
  lessons: L[]
): { resourceLessons: L[]; classLessons: L[] } {
  const resourceLessons: L[] = [];
  const classLessons: L[] = [];
  for (const l of lessons) {
    (isResourcesOnly(l) ? resourceLessons : classLessons).push(l);
  }
  return { resourceLessons, classLessons };
}

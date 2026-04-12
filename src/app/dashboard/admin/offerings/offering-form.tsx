/**
 * Offering Form — reusable form for creating and editing offerings.
 * Client Component: handles form state, validation, and Supabase mutations.
 *
 * When `offering` prop is passed → edit mode.
 * When absent → create mode.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Offering, Subject, OfferingType, OfferingStatus } from "@/lib/types/database";

interface SubjectDraft {
  id?: string; // existing subjects have an id
  title: string;
  slug: string;
  description: string;
  sort_order: number;
  instructor_id: string;
}

interface InstructorOption {
  id: string;
  full_name: string;
}

interface OfferingFormProps {
  offering?: Offering;
  existingSubjects?: Subject[];
  instructors?: InstructorOption[];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function OfferingForm({ offering, existingSubjects = [], instructors = [] }: OfferingFormProps) {
  const router = useRouter();
  const isEditing = !!offering;

  // Form state
  const [title, setTitle] = useState(offering?.title || "");
  const [slug, setSlug] = useState(offering?.slug || "");
  const [shortDescription, setShortDescription] = useState(
    offering?.short_description || ""
  );
  const [description, setDescription] = useState(offering?.description || "");
  const [type, setType] = useState<OfferingType>(offering?.type || "program");
  const [price, setPrice] = useState(offering?.price?.toString() || "0");
  const [status, setStatus] = useState<OfferingStatus>(
    offering?.status || "draft"
  );
  const [scheduleStart, setScheduleStart] = useState(
    offering?.schedule_start || ""
  );
  const [scheduleEnd, setScheduleEnd] = useState(offering?.schedule_end || "");
  // Subjects (for programs)
  const [subjects, setSubjects] = useState<SubjectDraft[]>(
    existingSubjects.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description || "",
      sort_order: s.sort_order,
      instructor_id: s.instructor_id,
    }))
  );

  const [saving, setSaving] = useState(false);

  // Auto-generate slug from title
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  }

  // ─── Subject Management ────────────────────────────────

  function addSubject() {
    setSubjects((prev) => [
      ...prev,
      {
        title: "",
        slug: "",
        description: "",
        sort_order: prev.length + 1,
        instructor_id: instructors[0]?.id || "",
      },
    ]);
  }

  function updateSubject(index: number, field: keyof SubjectDraft, value: string) {
    setSubjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-generate slug from title
      if (field === "title") {
        updated[index].slug = generateSlug(value);
      }
      return updated;
    });
  }

  function removeSubject(index: number) {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Submit ────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Please enter a slug.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      // Get current user for instructor_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const offeringData = {
        title: title.trim(),
        slug: slug.trim(),
        short_description: shortDescription.trim() || null,
        description: description.trim(),
        type,
        price: parseInt(price) || 0,
        status,
        schedule_start: scheduleStart || null,
        schedule_end: scheduleEnd || null,
        instructor_id: offering?.instructor_id || user?.id,
      };

      let offeringId: string;

      if (isEditing) {
        // Update existing offering
        const { error } = await supabase
          .from("offerings")
          .update(offeringData)
          .eq("id", offering.id);

        if (error) throw new Error(`Update failed: ${error.message}`);
        offeringId = offering.id;
      } else {
        // Create new offering
        const { data, error } = await supabase
          .from("offerings")
          .insert(offeringData)
          .select("id")
          .single();

        if (error) throw new Error(`Create failed: ${error.message}`);
        offeringId = data.id;
      }

      // Handle subjects for programs
      if (type === "program") {
        // Get IDs of existing subjects that are still in the form
        const keptIds = subjects
          .filter((s) => s.id)
          .map((s) => s.id as string);

        // Delete removed subjects
        if (isEditing) {
          const existingIds = existingSubjects.map((s) => s.id);
          const deletedIds = existingIds.filter((id) => !keptIds.includes(id));
          if (deletedIds.length > 0) {
            await supabase
              .from("subjects")
              .delete()
              .in("id", deletedIds);
          }
        }

        // Upsert subjects
        for (let i = 0; i < subjects.length; i++) {
          const subject = subjects[i];
          if (!subject.title.trim()) continue;

          const subjectData = {
            offering_id: offeringId,
            title: subject.title.trim(),
            slug: subject.slug || generateSlug(subject.title),
            description: subject.description.trim() || null,
            instructor_id: subject.instructor_id || user?.id,
            sort_order: i + 1,
          };

          if (subject.id) {
            // Update existing
            await supabase
              .from("subjects")
              .update(subjectData)
              .eq("id", subject.id);
          } else {
            // Insert new
            await supabase.from("subjects").insert(subjectData);
          }
        }
      }

      toast.success(
        isEditing ? "Offering updated!" : "Offering created!"
      );
      router.push("/dashboard/admin/offerings");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Back Link */}
      <LinkButton
        variant="ghost"
        href="/dashboard/admin/offerings"
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Back to Offerings
      </LinkButton>

      {/* ─── Basic Info ─────────────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <h2 className="font-heading font-semibold text-lg">Basic Info</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Sisterhood Islamic Studies"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="slug">
                URL Slug <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/offerings/</span>
                <Input
                  id="slug"
                  placeholder="sisterhood-islamic-studies"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={type}
                onChange={(e) => setType(e.target.value as OfferingType)}
              >
                <option value="program">Program</option>
                <option value="course">Course</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value as OfferingStatus)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Short Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input
                id="shortDesc"
                placeholder="One-liner for catalog cards"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>

            {/* Full Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">
                Full Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Detailed description shown on the offering page..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Pricing & Schedule ─────────────────────────── */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <h2 className="font-heading font-semibold text-lg">
            Pricing & Schedule
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price (PKR)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                placeholder="0 for free"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Subjects (Programs only) ───────────────────── */}
      {type === "program" && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-lg">Subjects</h2>
                <p className="text-sm text-muted-foreground">
                  Add subjects that make up this program.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSubject}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Subject
              </Button>
            </div>

            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No subjects yet. Click &ldquo;Add Subject&rdquo; to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-xl border bg-muted/20"
                  >
                    <div className="flex items-start pt-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Subject Title</Label>
                        <Input
                          placeholder="e.g. Fiqh — Islamic Jurisprudence"
                          value={subject.title}
                          onChange={(e) =>
                            updateSubject(index, "title", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Instructor</Label>
                        <select
                          value={subject.instructor_id}
                          onChange={(e) =>
                            updateSubject(index, "instructor_id", e.target.value)
                          }
                          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                        >
                          <option value="">Select instructor...</option>
                          {instructors.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Slug</Label>
                        <Input
                          placeholder="auto-generated"
                          value={subject.slug}
                          onChange={(e) =>
                            updateSubject(index, "slug", e.target.value)
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          placeholder="Brief description of this subject..."
                          rows={2}
                          value={subject.description}
                          onChange={(e) =>
                            updateSubject(index, "description", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSubject(index)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Actions ────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <LinkButton
          variant="outline"
          href="/dashboard/admin/offerings"
        >
          Cancel
        </LinkButton>

        <Button type="submit" size="lg" disabled={saving} className="press">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isEditing ? "Saving..." : "Creating..."}
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Create Offering"
          )}
        </Button>
      </div>
    </form>
  );
}

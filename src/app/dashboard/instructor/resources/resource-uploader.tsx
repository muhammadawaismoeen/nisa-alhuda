/**
 * Resource Uploader — drag-and-drop interface for uploading lesson resources.
 * Client component: manages file uploads to Supabase Storage + resources table.
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Loader2,
  CheckCircle,
  FolderOpen,
  BookOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Subject, Lesson, Resource } from "@/lib/types/database";

interface ResourceUploaderProps {
  subjects: Pick<Subject, "id" | "title">[];
  lessonsBySubject: Record<
    string,
    Pick<Lesson, "id" | "title" | "subject_id" | "sort_order">[]
  >;
  initialResources: Resource[];
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  webp: Image,
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResourceUploader({
  subjects,
  lessonsBySubject,
  initialResources,
}: ResourceUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentLessons = lessonsBySubject[selectedSubjectId] || [];
  const currentResources = selectedLessonId
    ? resources.filter((r) => r.lesson_id === selectedLessonId)
    : [];

  // Auto-select first lesson when subject changes
  function handleSubjectChange(subjectId: string) {
    setSelectedSubjectId(subjectId);
    const lessons = lessonsBySubject[subjectId] || [];
    setSelectedLessonId(lessons[0]?.id || "");
  }

  // File upload handler
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!selectedLessonId) {
        toast.error("Please select a lesson first.");
        return;
      }

      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Validate: max 10MB per file
      const MAX_SIZE = 10 * 1024 * 1024;
      const oversized = fileArray.filter((f) => f.size > MAX_SIZE);
      if (oversized.length > 0) {
        toast.error(`File(s) exceed 10MB limit: ${oversized.map((f) => f.name).join(", ")}`);
        return;
      }

      setUploading(true);

      try {
        const supabase = createClient();

        for (const file of fileArray) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
          const safeName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .toLowerCase();
          const storagePath = `${selectedLessonId}/${Date.now()}-${safeName}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("lesson-resources")
            .upload(storagePath, file);

          if (uploadError) {
            toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
            continue;
          }

          // Insert resource record
          const { data: resource, error: insertError } = await supabase
            .from("resources")
            .insert({
              lesson_id: selectedLessonId,
              title: file.name,
              file_url: storagePath,
              file_type: ext,
              file_size: file.size,
            })
            .select()
            .single();

          if (insertError) {
            toast.error(`Failed to save ${file.name}: ${insertError.message}`);
            // Clean up uploaded file
            await supabase.storage
              .from("lesson-resources")
              .remove([storagePath]);
            continue;
          }

          if (resource) {
            setResources((prev) => [resource as Resource, ...prev]);
          }

          toast.success(`Uploaded: ${file.name}`);
        }
      } catch (error) {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [selectedLessonId]
  );

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  // Delete resource
  async function handleDelete(resource: Resource) {
    if (!confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;

    setDeletingId(resource.id);
    try {
      const supabase = createClient();

      // Delete from storage
      await supabase.storage
        .from("lesson-resources")
        .remove([resource.file_url]);

      // Delete record
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", resource.id);

      if (error) throw error;

      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      toast.success("Resource deleted.");
    } catch {
      toast.error("Failed to delete resource.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Subject & Lesson Selector */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Select Lesson
            </h3>

            {/* Subject selector */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-muted-foreground">
                Subject
              </label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Lesson
              </label>
              {currentLessons.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No lessons in this subject yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {currentLessons.map((lesson, idx) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedLessonId === lesson.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground mr-2">
                        {idx + 1}.
                      </span>
                      {lesson.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resource count */}
        {selectedLessonId && (
          <div className="px-1">
            <p className="text-xs text-muted-foreground">
              {currentResources.length} resource
              {currentResources.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
        )}
      </div>

      {/* Right: Upload Zone & File List */}
      <div className="lg:col-span-2 space-y-4">
        {!selectedLessonId ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-1">
                Select a lesson
              </p>
              <p className="text-sm text-muted-foreground">
                Choose a subject and lesson to manage its resources.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.pptx,.xlsx,.mp3,.mp4"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Drag & drop files here or{" "}
                      <span className="text-primary">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, images, presentations, audio/video — max 10MB
                      per file
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Uploaded Resources */}
            {currentResources.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Uploaded Files
                </h3>
                {currentResources.map((resource) => {
                  const FileIcon = getFileIcon(resource.title);
                  return (
                    <Card key={resource.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <FileIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {resource.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(resource.file_size)}</span>
                              <span>&middot;</span>
                              <span className="uppercase">
                                {resource.file_type}
                              </span>
                              <span>&middot;</span>
                              <span>
                                {new Date(
                                  resource.created_at
                                ).toLocaleDateString("en-PK", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(resource)}
                            disabled={deletingId === resource.id}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Delete resource"
                          >
                            {deletingId === resource.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

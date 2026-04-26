/**
 * Manual Enrollment — admin can manually enroll or remove students.
 * Dialog with student/offering selectors and enroll/remove actions.
 * Uses server actions to handle applicant_email lookup.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  UserMinus,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { manualEnroll, removeEnrollment } from "./actions";

interface ManualEnrollmentProps {
  students: { id: string; full_name: string }[];
  offerings: { id: string; title: string; price: number }[];
  existingEnrollments: { studentId: string; offeringId: string }[];
}

export function ManualEnrollment({
  students,
  offerings,
  existingEnrollments,
}: ManualEnrollmentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"enroll" | "remove">("enroll");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedOffering, setSelectedOffering] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter students based on search
  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Check if enrollment already exists
  const enrollmentExists =
    selectedStudent &&
    selectedOffering &&
    existingEnrollments.some(
      (e) => e.studentId === selectedStudent && e.offeringId === selectedOffering
    );

  async function handleEnroll() {
    if (!selectedStudent || !selectedOffering) {
      toast.error("Please select both a student and an offering.");
      return;
    }

    if (enrollmentExists) {
      toast.error("This student is already enrolled in this offering.");
      return;
    }

    setSaving(true);
    try {
      const offering = offerings.find((o) => o.id === selectedOffering);
      const result = await manualEnroll(
        selectedStudent,
        selectedOffering,
        offering?.price || 0
      );

      if (!result.success) throw new Error(result.error);

      toast.success("Student enrolled successfully!");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to enroll student."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!selectedStudent || !selectedOffering) {
      toast.error("Please select both a student and an offering.");
      return;
    }

    if (!enrollmentExists) {
      toast.error("This student is not enrolled in this offering.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to remove this enrollment? The student will lose access."
      )
    )
      return;

    setSaving(true);
    try {
      const result = await removeEnrollment(selectedStudent, selectedOffering);
      if (!result.success) throw new Error(result.error);

      toast.success("Enrollment removed.");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove enrollment."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSelectedStudent("");
    setSelectedOffering("");
    setStudentSearch("");
    setMode("enroll");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors press">
        <UserPlus className="h-4 w-4 mr-1.5" />
        Manual Enroll
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Enrollment</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "enroll" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("enroll")}
              className="flex-1"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Enroll Student
            </Button>
            <Button
              variant={mode === "remove" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setMode("remove")}
              className="flex-1"
            >
              <UserMinus className="h-3.5 w-3.5 mr-1.5" />
              Remove Enrollment
            </Button>
          </div>

          {/* Student selector */}
          <div className="space-y-2">
            <Label>Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9 mb-2"
              />
            </div>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              size={Math.min(filteredStudents.length + 1, 6)}
            >
              <option value="">Select a student...</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Offering selector */}
          <div className="space-y-2">
            <Label>Offering</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
              value={selectedOffering}
              onChange={(e) => setSelectedOffering(e.target.value)}
            >
              <option value="">Select an offering...</option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} (PKR {o.price.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Status indicator */}
          {selectedStudent && selectedOffering && (
            <div
              className={`p-3 rounded-lg text-sm ${
                enrollmentExists
                  ? "bg-green-50 dark:bg-green-950/20 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {enrollmentExists
                ? "This student is currently enrolled in this offering."
                : "This student is NOT enrolled in this offering."}
            </div>
          )}

          {/* Action button */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {mode === "enroll" ? (
              <Button
                onClick={handleEnroll}
                disabled={
                  saving || !selectedStudent || !selectedOffering || !!enrollmentExists
                }
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Enroll Student
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={
                  saving || !selectedStudent || !selectedOffering || !enrollmentExists
                }
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserMinus className="h-4 w-4 mr-2" />
                )}
                Remove Enrollment
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

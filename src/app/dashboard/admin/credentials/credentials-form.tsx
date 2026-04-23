"use client";

/**
 * Credentials Form — pick a course, review enrolled students, select who
 * should receive a password setup / reset email, then send.
 */
import { useState, useTransition } from "react";
import {
  Send,
  Loader2,
  KeyRound,
  UserCheck,
  UserPlus,
  CheckCheck,
  Square,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getStudentsForOffering,
  sendCredentials,
  type StudentCredentialRow,
} from "./actions";

interface CredentialsFormProps {
  offerings: { id: string; title: string }[];
}

export function CredentialsForm({ offerings }: CredentialsFormProps) {
  const [offeringId, setOfferingId] = useState("");
  const [students, setStudents] = useState<StudentCredentialRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingList, startLoading] = useTransition();
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastFailures, setLastFailures] = useState<
    { email: string; error: string }[]
  >([]);

  function handleCourseChange(id: string) {
    setOfferingId(id);
    setStudents(null);
    setSelected(new Set());
    setShowConfirm(false);
    if (!id) return;

    startLoading(async () => {
      const res = await getStudentsForOffering(id);
      if (!res.success) {
        toast.error(res.error || "Failed to load students.");
        return;
      }
      setStudents(res.students || []);
    });
  }

  function toggleOne(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function toggleAll() {
    if (!students) return;
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.email)));
    }
  }

  async function handleSend() {
    if (!offeringId || selected.size === 0) {
      toast.error("Select a course and at least one student.");
      return;
    }
    setSending(true);
    try {
      const res = await sendCredentials(offeringId, Array.from(selected));
      if (res.sent > 0) {
        toast.success(
          `Sent credentials to ${res.sent} student${res.sent !== 1 ? "s" : ""}.${
            res.failed.length
              ? ` ${res.failed.length} failed — see details below.`
              : ""
          }`
        );
      } else {
        // Show the first failure reason — usually the same root cause for all.
        const firstReason = res.failed[0]?.error;
        toast.error(
          firstReason
            ? `All sends failed: ${firstReason}`
            : res.error || "No emails were sent."
        );
      }
      if (res.failed.length) {
        console.warn("[Credentials] Failed sends:", res.failed);
        setLastFailures(res.failed);
      } else {
        setLastFailures([]);
      }
      setShowConfirm(false);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  const allSelected = students && students.length > 0 && selected.size === students.length;

  return (
    <div className="space-y-6">
      {/* Step 1: Select Course */}
      <div>
        <h2 className="text-lg font-semibold mb-1">1. Select Course</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Credentials will be sent to students enrolled in the selected course.
        </p>
        <select
          className="flex h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
          value={offeringId}
          onChange={(e) => handleCourseChange(e.target.value)}
        >
          <option value="">Select a course...</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Student List */}
      {offeringId && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">2. Select Students</h2>
              <p className="text-sm text-muted-foreground">
                {students
                  ? `${students.length} enrolled — ${selected.size} selected`
                  : "Loading enrolled students..."}
              </p>
            </div>
            {students && students.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {allSelected ? (
                  <Square className="h-4 w-4 mr-1.5" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-1.5" />
                )}
                {allSelected ? "Unselect All" : "Select All"}
              </Button>
            )}
          </div>

          {loadingList && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading students...
            </div>
          )}

          {students && students.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No enrollments found for this course yet.
              </CardContent>
            </Card>
          )}

          {students && students.length > 0 && (
            <Card>
              <CardContent className="p-0 divide-y">
                {students.map((s) => {
                  const isChecked = selected.has(s.email);
                  return (
                    <label
                      key={s.enrollmentId}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 ${
                        isChecked ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(s.email)}
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">
                            {s.name || "(no name)"}
                          </p>
                          {s.hasAccount ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              Reset
                            </Badge>
                          ) : (
                            <Badge
                              className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100"
                            >
                              <UserPlus className="h-3 w-3" />
                              New Invite
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 capitalize"
                          >
                            {s.enrollmentStatus}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.email}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {students && students.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong>Reset</strong> = existing account (sends password reset
                link). <strong>New Invite</strong> = guest enrollment (sends
                account setup link that creates the account on first click).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Failure panel — surfaces Resend / Supabase errors per-recipient */}
      {lastFailures.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/[0.03]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold text-destructive">
                {lastFailures.length} send{lastFailures.length !== 1 ? "s" : ""} failed
              </p>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {lastFailures.map((f, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{f.email}</span>
                  <span className="text-muted-foreground"> — {f.error}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Send */}
      {students && students.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!showConfirm ? (
            <Button
              size="lg"
              disabled={selected.size === 0}
              onClick={() => setShowConfirm(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Send Credentials ({selected.size})
            </Button>
          ) : (
            <Card className="border-primary/30 bg-primary/[0.02] max-w-lg">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Confirm Credentials Email</h3>
                <p className="text-sm text-muted-foreground">
                  About to send {selected.size} credential email
                  {selected.size !== 1 ? "s" : ""}. Each recipient will receive
                  a secure link to set or reset their password.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(false)}
                    disabled={sending}
                  >
                    Go Back
                  </Button>
                  <Button size="sm" onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {sending ? "Sending..." : "Send Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
